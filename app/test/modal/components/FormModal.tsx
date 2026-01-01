'use client';

import { Overlay, ModalContainer, Header, Content, Footer } from '@/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import type { ModalProps } from '@/components/modal';

interface FormData {
  name: string;
  email: string;
}

interface FormModalProps extends ModalProps<FormData> {
  title: string;
}

export function FormModal({ title, onSubmit, onAbort }: FormModalProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: FormData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    };
    onSubmit(data);
  };

  return (
    <Overlay id="form-modal" onClose={onAbort}>
      <ModalContainer size="md">
        <form onSubmit={handleSubmit}>
          <Header title={title} onClose={onAbort} />
          <Content>
            <div className="space-y-4">
              <FormField label="이름" htmlFor="name" required>
                <Input id="name" name="name" required />
              </FormField>
              <FormField label="이메일" htmlFor="email" required>
                <Input id="email" name="email" type="email" required />
              </FormField>
            </div>
          </Content>
          <Footer>
            <Button type="button" intent="secondary" onClick={onAbort}>
              취소
            </Button>
            <Button type="submit">제출</Button>
          </Footer>
        </form>
      </ModalContainer>
    </Overlay>
  );
}
