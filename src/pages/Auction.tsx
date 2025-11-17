import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Legacy Auction placeholder to redirect users to the new list page.
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
            The auction entry point has moved, please use the new auction list to bid.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link to="/auction">
            <Button className="gap-2">Go to Auction List</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
