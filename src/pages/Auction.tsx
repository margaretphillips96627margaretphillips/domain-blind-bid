import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Legacy Auction 页面占位，提示跳转到新的拍卖列表。
 */
export default function Auction() {
  return (
    <div className="min-h-screen gradient-dark flex items-center justify-center px-4">
      <Card className="max-w-xl w-full border-accent/30 bg-surface/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Domain Auctions
          </CardTitle>
          <CardDescription>
            当前拍卖入口已更新，请前往新的拍卖列表查看和出价。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link to="/auction">
            <Button className="gap-2">前往拍卖列表</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
