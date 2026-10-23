import { Compass } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { navigate } from '../lib/router';

export function NotFoundPage(): JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <Compass className="h-12 w-12 text-muted-foreground" />
        <div>
          <h2 className="text-2xl font-semibold">页面不存在</h2>
          <p className="mt-2 text-sm text-muted-foreground">该地址没有对应页面，可能是链接已失效或输入有误。</p>
        </div>
        <Button variant="neon" onClick={() => navigate('/')}>返回仪表盘</Button>
      </CardContent>
    </Card>
  );
}
