'use client';

import { Overlay, ModalContainer, Header, Content, Footer } from '@/components/modal';
import { Button } from '@/components/ui/button';
import type { ModalProps } from '@/components/modal';

interface AlertModalProps extends ModalProps<'confirmed'> {
  title: string;
  message: string;
  confirmText?: string;
}

export function AlertModal({
  title,
  message,
  confirmText = '확인',
  onSubmit,
  onAbort,
}: AlertModalProps) {
  return (
    <Overlay id="alert-modal" onClose={onAbort}>
      <ModalContainer size="sm">
        <Header title={title} onClose={onAbort} />
        <Content>
          <p className="text-gray-700">{message}</p>
        </Content>
        <Footer>
          <Button onClick={() => onSubmit('confirmed')}>{confirmText}</Button>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
