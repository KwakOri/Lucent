'use client';

import { Content, Footer, Header, type ModalProps } from '@/components/modal';
import { Button } from '@/components/ui/button';
import { BankAccountInfo } from './BankAccountInfo';

interface DepositInfoModalProps extends ModalProps<void> {
  orderNo: string;
  depositorName: string;
  totalAmount: number;
}

export function DepositInfoModal({
  orderNo,
  depositorName,
  totalAmount,
  onAbort,
}: DepositInfoModalProps) {
  return (
    <>
      <Header title="입금 정보 확인" onClose={() => onAbort('close')} />
      <Content className="space-y-3 bg-neutral-50">
        <p className="text-sm text-text-secondary">주문번호: {orderNo}</p>
        <BankAccountInfo depositorName={depositorName} totalAmount={totalAmount} />
      </Content>
      <Footer>
        <Button intent="secondary" size="sm" onClick={() => onAbort('close')}>
          닫기
        </Button>
      </Footer>
    </>
  );
}
