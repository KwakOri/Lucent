'use client';

import { useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content, Footer, Header, type ModalProps } from '@/components/modal';
import { useModal } from '@/components/modal';
import { useToast } from '@/src/components/toast';
import type { ToastOptions } from '@/src/components/toast';
import {
  adminButtonClass,
  adminPrimaryButtonClass,
} from '@/src/components/admin/AdminDesignSystem';

type AdminConfirmTone = 'default' | 'danger' | 'success' | 'warning';
type AdminConfirmResult = 'confirm' | 'cancel';

export type AdminConfirmOptions = {
  title: string;
  message: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: AdminConfirmTone;
};

type AdminConfirmModalProps = ModalProps<AdminConfirmResult> & AdminConfirmOptions;

const toneMeta: Record<
  AdminConfirmTone,
  {
    icon: typeof AlertTriangle;
    iconClass: string;
    confirmClass: string;
  }
> = {
  default: {
    icon: Info,
    iconClass: 'bg-[#eaf3fc] text-[#4a88b9]',
    confirmClass: adminPrimaryButtonClass,
  },
  danger: {
    icon: XCircle,
    iconClass: 'bg-[#fff0f0] text-[#ca2a30]',
    confirmClass:
      '!h-11 !rounded-[12px] !bg-[#ca2a30] !px-4 !text-sm !font-bold !text-white !whitespace-nowrap hover:!bg-[#b92328]',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'bg-[#eafaea] text-[#297c3b]',
    confirmClass: adminPrimaryButtonClass,
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'bg-[#fff4d5] text-[#a35200]',
    confirmClass: adminPrimaryButtonClass,
  },
};

function AdminConfirmModal({
  title,
  message,
  description,
  confirmText = '확인',
  cancelText = '취소',
  tone = 'warning',
  onSubmit,
  onAbort,
}: AdminConfirmModalProps) {
  const meta = toneMeta[tone];
  const Icon = meta.icon;

  return (
    <>
      <Header title={title} onClose={() => onAbort('cancel')} />
      <Content>
        <div className="flex gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${meta.iconClass}`}>
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="break-words text-sm font-bold leading-6 text-[#1a1a2e]">
              {message}
            </p>
            {description ? (
              <p className="mt-2 break-words text-sm font-medium leading-6 text-[#1a1a2e]/55">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </Content>
      <Footer>
        <Button className={adminButtonClass} onClick={() => onAbort('cancel')}>
          {cancelText}
        </Button>
        <Button className={meta.confirmClass} onClick={() => onSubmit('confirm')}>
          {confirmText}
        </Button>
      </Footer>
    </>
  );
}

export function useAdminFeedback() {
  const { openModal } = useModal();
  const { showToast, dismissAll, dismissToast } = useToast();

  const confirm = useCallback(
    async (options: AdminConfirmOptions): Promise<boolean> => {
      try {
        const result = await openModal<AdminConfirmResult>(AdminConfirmModal, {
          ...options,
          size: 'sm',
          tone: options.tone || 'warning',
        });
        return result === 'confirm';
      } catch {
        return false;
      }
    },
    [openModal],
  );

  const notify = useCallback(
    (message: string, options?: ToastOptions) => showToast(message, options),
    [showToast],
  );

  return {
    confirm,
    notify,
    showToast,
    dismissToast,
    dismissAll,
  };
}
