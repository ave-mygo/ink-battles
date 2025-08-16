#!/usr/bin/env python3
"""
从 api_data.json 分析各模型的请求成本（美元），并输出中文报告和图表。

计算假设：
- 每个模型有“输入单价(USD/百万tokens)”和“输出单价(USD/百万tokens)”可配置；
- 也可从数据里 `other.completion_ratio`、`other.group_ratio` 提取补全倍率和分组倍率；
- 若配置与数据同时存在：倍率以“数据优先”，单价以“变量优先”（便于拟合/定价）；
- 成本公式：
  total = (prompt_tokens/1e6 * in_price + completion_tokens/1e6 * out_price) * group_ratio
- 可选是否应用 `model_ratio` 到单价（默认不应用，以符合用户示例）。

用法：
  python analyze_pricing.py [--file api_data.json] [--use-model-ratio] [--save]

输出：
- 终端中文统计；
- 保存图片（如开启 --save）：每模型“单次成本箱线图”和“中位数成本柱状图”。
"""
from __future__ import annotations

import argparse
import json
import math
import os
from dataclasses import dataclass
from statistics import mean, median
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

MILLION = 1_000_000

# —— 定价变量（清晰变量名便于查看和调整）——
# 说明：按模型配置“输入单价/输出单价/默认补全倍率/默认分组倍率”。
# - base_input_price_usd_per_million: 输入单价（USD/百万tokens）
# - base_output_price_usd_per_million: 输出单价（USD/百万tokens）。如果为空则用“输入单价×补全倍率” 推导
# - default_completion_ratio: 若数据无 completion_ratio 时的补全倍率默认值
# - default_group_ratio: 若数据无 group_ratio 时的分组倍率默认值
# 模型名采用包含匹配（不区分大小写）。
MODEL_CONFIG: List[Dict[str, Any]] = [
    {
        "match": "gemini-2.5-pro",
        "base_input_price_usd_per_million": 1.25,
        "base_output_price_usd_per_million": None,  # 留空则由补全倍率推导
        "default_completion_ratio": 8.0,
        "default_group_ratio": 1.0,
    },
    {
        "match": "gemini-2.5-flash",
        "base_input_price_usd_per_million": 0.30,
        "base_output_price_usd_per_million": 2.50,
        "default_completion_ratio": None,
        "default_group_ratio": 1.0,
    },
    {
        "match": "gemini-2.0-flash",
        "base_input_price_usd_per_million": 0.30,
        "base_output_price_usd_per_million": 2.50,
        "default_completion_ratio": None,
        "default_group_ratio": 1.0,
    },
    {
        "match": "flash",  # 兜底匹配任意 flash 变体
        "base_input_price_usd_per_million": 0.30,
        "base_output_price_usd_per_million": 2.50,
        "default_completion_ratio": None,
        "default_group_ratio": 1.0,
    },
]


def match_model_config(model_name: str) -> Optional[Dict[str, Any]]:
    name = (model_name or "").lower()
    for cfg in MODEL_CONFIG:
        if cfg.get("match", "").lower() in name:
            return cfg
    return None


def parse_other(other_raw: Any) -> Dict[str, Any]:
    """`other` 可能是 JSON 字符串；鲁棒解析并给默认值。"""
    if isinstance(other_raw, dict):
        d = other_raw
    else:
        try:
            d = json.loads(other_raw) if other_raw else {}
        except Exception:
            d = {}
    # 解析后若非字典（比如 JSON 为 null/[]/""），统一降级为空字典
    if not isinstance(d, dict):
        d = {}
    # 默认值（数据中缺失时使用）
    return {
        "completion_ratio": d.get("completion_ratio", 1.0),
        "group_ratio": d.get("group_ratio", 1.0),
        "model_ratio": d.get("model_ratio", 1.0),
    }


@dataclass
class CostRow:
    model_name: str
    token_name: str
    prompt_tokens: int
    completion_tokens: int
    base_in_price: Optional[float]
    base_out_price: Optional[float]
    completion_ratio: float
    group_ratio: float
    model_ratio: float
    cost_usd: Optional[float]  # None if base price unknown


def estimate_cost_usd(
    prompt_tokens: int,
    completion_tokens: int,
    base_in_price: float,
    base_out_price: Optional[float],
    completion_ratio: float,
    group_ratio: float,
    model_ratio: float,
    use_model_ratio: bool,
) -> float:
    # 输入/输出 单价（USD/百万 tokens）
    in_price = base_in_price
    # 输出单价优先用变量；未提供则以输入单价×补全倍率推导
    out_price = base_out_price if base_out_price is not None else base_in_price * completion_ratio

    if use_model_ratio:
        # 可选：将 model_ratio 乘到单价上
        in_price *= model_ratio
        out_price *= model_ratio

    input_cost = (prompt_tokens / MILLION) * in_price
    output_cost = (completion_tokens / MILLION) * out_price
    total = (input_cost + output_cost) * group_ratio
    return total


def build_dataframe(records: List[Dict[str, Any]], use_model_ratio: bool) -> pd.DataFrame:
    rows: List[CostRow] = []
    for rec in records:
        model_name = rec.get("model_name") or ""
        token_name = rec.get("token_name") or ""
        prompt_tokens = int(rec.get("prompt_tokens", 0) or 0)
        completion_tokens = int(rec.get("completion_tokens", 0) or 0)
        other = parse_other(rec.get("other"))
        cfg = match_model_config(model_name)
        base_in_price = cfg.get("base_input_price_usd_per_million") if cfg else None
        base_out_price = cfg.get("base_output_price_usd_per_million") if cfg else None

        # 倍率优先用“数据里的 other”，缺失时降级到配置里的默认值
        completion_ratio = other.get("completion_ratio") or (cfg.get("default_completion_ratio") if cfg else 1.0)
        group_ratio = other.get("group_ratio") or (cfg.get("default_group_ratio") if cfg else 1.0)
        model_ratio = other.get("model_ratio", 1.0)

        cost_usd: Optional[float]
        if base_in_price is None:
            cost_usd = None
        else:
            cost_usd = estimate_cost_usd(
                prompt_tokens,
                completion_tokens,
                base_in_price,
                base_out_price,
                completion_ratio,
                group_ratio,
                model_ratio,
                use_model_ratio,
            )

        rows.append(
            CostRow(
                model_name=model_name,
                token_name=token_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                base_in_price=base_in_price,
                base_out_price=base_out_price,
                completion_ratio=completion_ratio,
                group_ratio=group_ratio,
                model_ratio=model_ratio,
                cost_usd=cost_usd,
            )
        )

    df = pd.DataFrame([r.__dict__ for r in rows])
    return df


def summarize(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, float]]:
    known_df = df[df["cost_usd"].notna()].copy()
    if known_df.empty:
        return pd.DataFrame(), {}

    def agg(group: pd.DataFrame) -> pd.Series:
        costs = group["cost_usd"].astype(float).tolist()
        return pd.Series(
            {
                "count": len(costs),
                "mean": float(mean(costs)),
                "median": float(median(costs)),
                "p90": float(pd.Series(costs).quantile(0.90)),
                "min": float(min(costs)),
                "max": float(max(costs)),
                "total": float(sum(costs)),
                "avg_input_tokens": float(group["prompt_tokens"].mean()),
                "avg_output_tokens": float(group["completion_tokens"].mean()),
                "min_input_tokens": float(group["prompt_tokens"].min()),
                "max_input_tokens": float(group["prompt_tokens"].max()),
                "min_output_tokens": float(group["completion_tokens"].min()),
                "max_output_tokens": float(group["completion_tokens"].max()),
            }
        )

    per_model = known_df.groupby("model_name", dropna=False).apply(agg).reset_index()

    overall_costs = known_df["cost_usd"].astype(float).tolist()
    overall = {
        "count": len(overall_costs),
        "mean": float(mean(overall_costs)),
        "median": float(median(overall_costs)),
        "p90": float(pd.Series(overall_costs).quantile(0.90)),
        "min": float(min(overall_costs)),
        "max": float(max(overall_costs)),
        "total": float(sum(overall_costs)),
    }
    return per_model, overall


def print_report(per_model: pd.DataFrame, overall: Dict[str, float], used_model_ratio: bool) -> None:
    header = f"成本估算报告 (是否应用model_ratio: {used_model_ratio})"
    print("\n" + header)
    print("=" * len(header))

    if per_model.empty:
        print("没有匹配到已知单价的模型，请在变量 MODEL_CONFIG 中补充配置。")
        return

    print("\n各模型单次成本统计（美元）:")
    for _, row in per_model.sort_values("median").iterrows():
        print(
            f"- {row['model_name']}: 次数={int(row['count'])}, "
            f"中位数=${row['median']:.6f}, 均值=${row['mean']:.6f}, P90=${row['p90']:.6f}, "
            f"最小=${row['min']:.6f}, 最大=${row['max']:.6f}; "
            f"平均输入tokens={row['avg_input_tokens']:.0f}, 平均输出tokens={row['avg_output_tokens']:.0f}, "
            f"最小输入tokens={row['min_input_tokens']:.0f}, 最大输入tokens={row['max_input_tokens']:.0f}, "
            f"最小输出tokens={row['min_output_tokens']:.0f}, 最大输出tokens={row['max_output_tokens']:.0f}"
        )

    print("\n总体:")
    print(
        f"- 次数={overall['count']}, 中位数=${overall['median']:.6f}, "
        f"均值=${overall['mean']:.6f}, P90=${overall['p90']:.6f}, "
        f"最小=${overall['min']:.6f}, 最大=${overall['max']:.6f}, 总成本=${overall['total']:.6f}"
    )


def setup_chinese_font():
    # 尝试常见中文字体，按顺序回退
    plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SF Pro', 'PingFang SC', 'Hiragino Sans GB', 'SimHei', 'Noto Sans CJK SC', 'WenQuanYi Zen Hei', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False


def plot_figures(df: pd.DataFrame, per_model: pd.DataFrame, out_dir: str) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    setup_chinese_font()
    saved: List[str] = []

    known_df = df[df["cost_usd"].notna()].copy()
    if known_df.empty:
        return saved

    # 1) 箱线图：各模型单次成本分布
    plt.figure(figsize=(9, 5))
    sns.boxplot(data=known_df, x="model_name", y="cost_usd")
    plt.xlabel("模型")
    plt.ylabel("单次成本（美元）")
    plt.title("各模型单次成本箱线图")
    plt.xticks(rotation=20, ha='right')
    path1 = os.path.join(out_dir, "box_cost_per_model.png")
    plt.tight_layout()
    plt.savefig(path1, dpi=160)
    plt.close()
    saved.append(path1)

    # 2) 柱状图：各模型中位数成本
    pm = per_model.sort_values("median")
    plt.figure(figsize=(9, 5))
    sns.barplot(data=pm, x="model_name", y="median", color="#4C78A8")
    plt.xlabel("模型")
    plt.ylabel("中位数单次成本（美元）")
    plt.title("各模型单次成本中位数")
    plt.xticks(rotation=20, ha='right')
    path2 = os.path.join(out_dir, "bar_median_cost_per_model.png")
    plt.tight_layout()
    plt.savefig(path2, dpi=160)
    plt.close()
    saved.append(path2)

    return saved


def main():
    parser = argparse.ArgumentParser(description="根据 api_data.json 估算各模型单次成本（美元），输出中文报告与图表")
    parser.add_argument("--file", default=os.path.join(os.path.dirname(__file__), "api_data.json"), help="api_data.json 路径")
    parser.add_argument("--use-model-ratio", action="store_true", help="是否将 model_ratio 乘到单价（默认否）")
    parser.add_argument("--save", action="store_true", help="是否保存图表到 scripts/py/figures 目录")
    args = parser.parse_args()

    with open(args.file, "r", encoding="utf-8") as f:
        records = json.load(f)
        if not isinstance(records, list):
            raise ValueError("api_data.json 应该是记录列表(list)")

    df = build_dataframe(records, use_model_ratio=args.use_model_ratio)
    per_model, overall = summarize(df)
    print_report(per_model, overall, used_model_ratio=args.use_model_ratio)

    if args.save and not per_model.empty:
        out_dir = os.path.join(os.path.dirname(__file__), "figures")
        saved = plot_figures(df, per_model, out_dir)
        if saved:
            print("\n已保存图表：")
            for p in saved:
                print(f"- {p}")


if __name__ == "__main__":
    main()
