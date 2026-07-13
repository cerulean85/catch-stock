'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ScoredItem } from '../model/types';
import { ScoreDetail } from './ScoreDetail';

export function ScoringTable({ items, preset }: { items: ScoredItem[]; preset: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
        스코어링 결과가 없습니다. 유니버스/프리셋을 바꾸거나 새로고침해 보세요.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[36px]" />
            <TableHead className="w-[90px]">Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead className="text-right">종합</TableHead>
            <TableHead className="hidden text-right md:table-cell">가치</TableHead>
            <TableHead className="hidden text-right md:table-cell">성장</TableHead>
            <TableHead className="hidden text-right md:table-cell">기술</TableHead>
            <TableHead className="hidden text-right md:table-cell">매크로</TableHead>
            <TableHead className="text-center">필터</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isOpen = expanded === item.symbol;
            return (
              <Fragment key={item.symbol}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : item.symbol)}
                >
                  <TableCell>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-medium">{item.symbol}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.sector}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <CompositeBadge value={item.composite} />
                  </TableCell>
                  {item.areas.map((a) => (
                    <TableCell
                      key={a.area}
                      className="hidden text-right tabular-nums text-muted-foreground md:table-cell"
                    >
                      {a.score !== null ? a.score.toFixed(1) : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    {item.passedFilter ? (
                      <Badge variant="default">통과</Badge>
                    ) : (
                      <Badge variant="destructive">탈락</Badge>
                    )}
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow>
                    <TableCell colSpan={10} className="p-0">
                      <ScoreDetail symbol={item.symbol} preset={preset} detail={item.detail} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function CompositeBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const variant = value >= 60 ? 'default' : value < 45 ? 'destructive' : 'secondary';
  return (
    <Badge variant={variant} className="tabular-nums text-sm">
      {value.toFixed(1)}
    </Badge>
  );
}
