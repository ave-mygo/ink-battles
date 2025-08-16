#!/usr/bin/env python3
"""
API数据获取脚本
从 newapi.sisuo.de 获取所有分页数据
"""

import requests
import json
import time
from typing import Dict, List, Any
from math import ceil
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime


class APIDataFetcher:
    def __init__(self, base_url: str, session_cookie: str, use_local_proxy: bool = True, proxy_url: str = "http://127.0.0.1:7890"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json, text/plain, */*',
            # 不主动声明 br/zstd，交给 requests 自处理（默认支持 gzip/deflate）
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
            'Cache-Control': 'no-store',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'new-api-user': '4',
            'Authorization': f"Bearer {session_cookie}",
        })
        # 可选：走本地代理（与你示例的远程地址 127.0.0.1:7890 一致）
        if use_local_proxy:
            self.session.proxies.update({
                'http': proxy_url,
                'https': proxy_url,
            })
    
    def fetch_page(self, page: int, page_size: int = 200) -> Dict[str, Any]:
        """获取指定页面的数据"""
        now_ts = int(time.time())
        params = {
            'p': page,
            'page_size': page_size,
            'type': 0,
            'token_name': 'gemini',  # 根据你的示例固定为 gemini
            'model_name': 'gemini-2.5-pro',
            'start_timestamp': 1752595200,
            'end_timestamp': now_ts,  # 动态使用当前时间
            'group': ''
        }
        
        url = f"{self.base_url}/api/log/self"
        
        try:
            response = self.session.get(url, params=params, timeout=30)
            # 记录请求的最终 URL 与状态码，便于排查
            final_url = response.url
            status = response.status_code
            response.raise_for_status()
            try:
                return response.json()
            except ValueError:
                # 若是压缩编码导致解析失败，尝试手动解压
                enc = (response.headers.get('Content-Encoding') or '').lower()
                raw = response.content or b''
                if enc == 'br':
                    try:
                        import brotli  # type: ignore
                        text = brotli.decompress(raw).decode('utf-8', errors='replace')
                        return json.loads(text)
                    except Exception:
                        pass
                elif enc in ('zstd', 'zst'):
                    try:
                        import zstandard as zstd  # type: ignore
                        dctx = zstd.ZstdDecompressor()
                        text = dctx.decompress(raw).decode('utf-8', errors='replace')
                        return json.loads(text)
                    except Exception:
                        pass

                # 退化重试：限制 Accept-Encoding 避免 br/zstd
                try:
                    retry_headers = dict(self.session.headers)
                    retry_headers['Accept-Encoding'] = 'gzip, deflate'
                    retry_resp = self.session.get(url, params=params, headers=retry_headers, timeout=30)
                    retry_resp.raise_for_status()
                    return retry_resp.json()
                except Exception:
                    text_snippet = (response.text or "")[:200]
                    print(f"第{page}页返回的不是JSON。status={status} url={final_url} body前200字: {text_snippet}")
                    return None
        except requests.exceptions.RequestException as e:
            print(f"请求第{page}页时发生错误: {e}")
            return None
    
    def fetch_all_data(self, page_size: int = 500, max_workers: int = 8, sort_key: str = 'created_at', ascending: bool = True) -> List[Dict[str, Any]]:
        """获取所有分页数据（并发下载），并按 created_at 由旧到新排序。

        :param page_size: 每页数量
        :param max_workers: 并发线程数（requests 为 I/O 密集，线程并发合适）
        :param sort_key: 用于排序的键，默认 'created_at'
        :param ascending: 是否升序（旧到新）
        """
        print("开始获取数据（并发）...")

        # 先获取第 1 页，拿到 total 与 items
        first_page = 1
        print(f"正在获取第{first_page}页数据...")
        first = self.fetch_page(first_page, page_size)
        if not first or not first.get('success'):
            print("获取第1页失败或无数据")
            return []

        all_items: List[Dict[str, Any]] = []
        first_items = first.get('data', {}).get('items', []) or []
        all_items.extend(first_items)

        total = first.get('data', {}).get('total', 0) or 0
        # 真实的每页条数：优先使用响应中的字段，否则用首页返回的 items 数
        data_meta = first.get('data', {})
        resp_page_size = data_meta.get('page_size') or data_meta.get('pageSize')
        items_per_page = int(resp_page_size) if isinstance(resp_page_size, int) and resp_page_size > 0 else len(first_items)
        if items_per_page <= 0:
            print("首页 items 为空，无法估算页数")
            return self._sort_items(all_items, sort_key, ascending)

        # 不再信任响应中的总页数字段，直接用 items_per_page 推算
        total_pages = ceil(total / items_per_page)
        print(f"总记录数: {total}，预计页数: {total_pages}（每页约 {items_per_page} 条）")

        if total_pages <= 1:
            # 只有一页，直接排序返回
            return self._sort_items(all_items, sort_key, ascending)

        # 并发获取剩余页面
        pages_to_fetch = list(range(2, total_pages + 1))
        fetched_pages = 1

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_page = {executor.submit(self.fetch_page, p, page_size): p for p in pages_to_fetch}
            for future in as_completed(future_to_page):
                p = future_to_page[future]
                try:
                    data = future.result()
                except Exception as e:
                    print(f"并发获取第{p}页异常: {e}")
                    continue

                if not data or not data.get('success'):
                    print(f"获取第{p}页失败或无数据")
                    continue

                items = data.get('data', {}).get('items', []) or []
                all_items.extend(items)
                fetched_pages += 1
                print(f"并发进度: {fetched_pages}/{total_pages} 页，累计 {len(all_items)}/{total} 条")

        # 排序：按 created_at（或指定键）由旧到新
        return self._sort_items(all_items, sort_key, ascending)

    def _sort_items(self, items: List[Dict[str, Any]], sort_key: str, ascending: bool) -> List[Dict[str, Any]]:
        """根据 sort_key 排序，尽量兼容 int/float/ISO8601 字符串时间。"""
        def to_ts(v):
            if v is None:
                return float('inf') if ascending else float('-inf')
            # 直接是数字时间戳
            if isinstance(v, (int, float)):
                return float(v)
            # ISO8601 字符串
            if isinstance(v, str):
                s = v.strip()
                # 常见的以 Z 结尾的 UTC
                if s.endswith('Z'):
                    s = s.replace('Z', '+00:00')
                try:
                    return datetime.fromisoformat(s).timestamp()
                except Exception:
                    # 非标准格式，尝试秒级数字字符串
                    try:
                        return float(s)
                    except Exception:
                        return float('inf') if ascending else float('-inf')
            # 其他未知类型
            return float('inf') if ascending else float('-inf')

        # 同时兼容一些可能的备选键
        fallback_keys = [sort_key, 'createdAt', 'create_time', 'timestamp', 'time']

        def key_func(item: Dict[str, Any]):
            for k in fallback_keys:
                if k in item:
                    return to_ts(item.get(k))
            return float('inf') if ascending else float('-inf')

        try:
            return sorted(items, key=key_func, reverse=not ascending)
        except Exception as e:
            print(f"排序失败，返回未排序数据。错误: {e}")
            return items
    
    def save_to_json(self, data: List[Dict[str, Any]], filename: str):
        """保存数据到JSON文件"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"数据已保存到 {filename}")
    
    def analyze_data(self, data: List[Dict[str, Any]]):
        """分析数据统计信息"""
        if not data:
            print("无数据可分析")
            return
        
        total_records = len(data)
        total_quota = sum(item.get('quota', 0) for item in data)
        total_prompt_tokens = sum(item.get('prompt_tokens', 0) for item in data)
        total_completion_tokens = sum(item.get('completion_tokens', 0) for item in data)
        
        models = {}
        for item in data:
            model = item.get('model_name', 'unknown')
            if model not in models:
                models[model] = 0
            models[model] += 1
        
        print("\n=== 数据统计 ===")
        print(f"总记录数: {total_records}")
        print(f"总配额消耗: {total_quota:,}")
        print(f"总输入token: {total_prompt_tokens:,}")
        print(f"总输出token: {total_completion_tokens:,}")
        print(f"总token: {(total_prompt_tokens + total_completion_tokens):,}")
        
        print("\n=== 模型使用统计 ===")
        for model, count in sorted(models.items(), key=lambda x: x[1], reverse=True):
            print(f"{model}: {count} 次")


def main():
    # 配置参数
    BASE_URL = "https://newapi.yumetsuki.moe"
    SESSION_COOKIE = "tZKC1cPot7VYJr2rljExyCo+Fx9Yjw=="
    
    # 创建数据获取器
    fetcher = APIDataFetcher(BASE_URL, SESSION_COOKIE)
    
    # 获取所有数据
    all_data = fetcher.fetch_all_data()
    
    if all_data:
        # 保存数据
        output_file = "api_data.json"
        fetcher.save_to_json(all_data, output_file)
        
        # 分析数据
        fetcher.analyze_data(all_data)
    else:
        print("未获取到任何数据")


if __name__ == "__main__":
    main()