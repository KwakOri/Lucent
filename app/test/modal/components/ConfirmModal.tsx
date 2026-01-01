'use client';

import { Overlay, ModalContainer, Header, Content, Footer } from '@/components/modal';
import { Button } from '@/components/ui/button';
import type { ModalProps } from '@/components/modal';

interface ConfirmModalProps extends ModalProps<'confirm' | 'cancel'> {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger' | 'success' | 'warning';
  disableBackdropClick?: boolean;
  disableEscapeKey?: boolean;
}

export function ConfirmModal({
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  tone = 'default',
  onSubmit,
  onAbort,
}: ConfirmModalProps) {
  return (
    <Overlay id="confirm-modal" onClose={() => onAbort('cancel')}>
      <ModalContainer size="md" tone={tone}>
        <Header title={title} onClose={() => onAbort('cancel')} />
        <Content>
          <p className="text-gray-700">{message}</p>
        </Content>
        <Footer>
          <Button intent="secondary" onClick={() => onAbort('cancel')}>
            {cancelText}
          </Button>
          <Button
            intent={tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => onSubmit('confirm')}
          >
            {confirmText}
          </Button>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
