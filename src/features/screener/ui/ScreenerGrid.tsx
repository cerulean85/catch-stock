'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ScreenerItem } from '../model/types';

interface Props {
  items: ScreenerItem[];
}

export function ScreenerGrid({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
        조건을 만족하는 종목이 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Daily RSI14</TableHead>
            <TableHead className="text-right">Monthly RSI14</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.symbol}>
              <TableCell className="font-mono font-medium">{item.symbol}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.sector}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                ${item.price.toFixed(2)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.dailyRSI14.toFixed(2)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {item.monthlyRSI14.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
