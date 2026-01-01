'use client';

import { Overlay, ModalContainer, Header, Content, Footer } from '@/components/modal';
import { Button } from '@/components/ui/button';
import type { ModalProps } from '@/components/modal';

interface CustomModalProps extends ModalProps<string> {
  title: string;
  content: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  position?: 'center' | 'bottom';
  tone?: 'default' | 'danger' | 'success' | 'warning';
  disableBackdropClick?: boolean;
  disableEscapeKey?: boolean;
}

export function CustomModal({
  title,
  content,
  size = 'md',
  position = 'center',
  tone = 'default',
  disableBackdropClick = false,
  disableEscapeKey = false,
  onSubmit,
  onAbort,
}: CustomModalProps) {
  return (
    <Overlay
      id="custom-modal"
      onClose={onAbort}
      disableBackdropClick={disableBackdropClick}
      disableEscapeKey={disableEscapeKey}
    >
      <ModalContainer size={size} position={position} tone={tone}>
        <Header
          title={title}
          showCloseButton={!disableBackdropClick && !disableEscapeKey}
          onClose={onAbort}
        />
        <Content>
          <div className="space-y-4">
            <p className="text-gray-700">{content}</p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Size: {size}</p>
              <p>Position: {position}</p>
              <p>Tone: {tone}</p>
              <p>Backdrop Click: {disableBackdropClick ? 'Disabled' : 'Enabled'}</p>
              <p>ESC Key: {disableEscapeKey ? 'Disabled' : 'Enabled'}</p>
            </div>
          </div>
        </Content>
        <Footer>
          <Button intent="secondary" onClick={onAbort}>
            취소
          </Button>
          <Button onClick={() => onSubmit('completed')}>확인</Button>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
