"use client";

import { useState } from "react";
import { LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * 登录表单组件
 * @returns 登录交互卡片
 */
const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error("请填写邮箱和密码");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("登录成功");
        window.location.href = "/";
      } else {
        toast.error(data.message || "登录失败");
      }
    } catch (error) {
      console.error(error);
      toast.error("登录失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-[calc(100vh-0px)]">
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <LogIn className="h-5 w-5 text-blue-600" /> 登录
            </CardTitle>
            <CardDescription>输入邮箱和密码以进入系统</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600" /> 邮箱</div>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Lock className="h-4 w-4 text-blue-600" /> 密码</div>
              <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" />
            </div>
            <Button disabled={loading} onClick={handleSubmit} className="w-full">
              {loading ? "正在登录..." : (<span className="flex items-center justify-center gap-2">进入 <ArrowRight className="h-4 w-4" /></span>)}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              还没有账号？ <a className="text-blue-600 hover:underline" href="/signup">去注册</a> · 想支持我们？ <a className="text-pink-600 hover:underline" href="/sponsors">去赞助</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignInForm;


