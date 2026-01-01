'use client';

import { useModal } from '@/components/modal';
import { Button } from '@/components/ui/button';
import { AlertModal } from './components/AlertModal';
import { ConfirmModal } from './components/ConfirmModal';
import { FormModal } from './components/FormModal';
import { CustomModal } from './components/CustomModal';

export default function ModalTestPage() {
  const { openModal, renderModal } = useModal();

  // ========================================
  // 기본 모달 테스트
  // ========================================
  const handleAlertModal = async () => {
    try {
      const result = await openModal<'confirmed'>(AlertModal, {
        title: '알림',
        message: '이것은 기본 Alert 모달입니다.',
      });
      console.log('Alert 결과:', result);
    } catch (error) {
      console.log('Alert 취소:', error);
    }
  };

  const handleConfirmModal = async () => {
    try {
      const result = await openModal<'confirm' | 'cancel'>(ConfirmModal, {
        title: '확인',
        message: '정말 진행하시겠습니까?',
      });
      console.log('Confirm 결과:', result);
      if (result === 'confirm') {
        alert('확인을 누르셨습니다!');
      }
    } catch (error) {
      console.log('Confirm 취소:', error);
    }
  };

  const handleFormModal = async () => {
    try {
      const result = await openModal<{ name: string; email: string }>(FormModal, {
        title: '사용자 정보 입력',
      });
      console.log('Form 결과:', result);
      alert(`입력된 정보:\n이름: ${result.name}\n이메일: ${result.email}`);
    } catch (error) {
      console.log('Form 취소:', error);
    }
  };

  // ========================================
  // Size 테스트
  // ========================================
  const handleSmallModal = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Small Modal',
        content: '작은 크기의 모달입니다.',
        size: 'sm',
      });
      console.log('Small 결과:', result);
    } catch (error) {
      console.log('Small 취소:', error);
    }
  };

  const handleMediumModal = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Medium Modal',
        content: '중간 크기의 모달입니다.',
        size: 'md',
      });
      console.log('Medium 결과:', result);
    } catch (error) {
      console.log('Medium 취소:', error);
    }
  };

  const handleLargeModal = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Large Modal',
        content: '큰 크기의 모달입니다.',
        size: 'lg',
      });
      console.log('Large 결과:', result);
    } catch (error) {
      console.log('Large 취소:', error);
    }
  };

  const handleFullModal = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Full Modal',
        content: '전체 화면 모달입니다.',
        size: 'full',
      });
      console.log('Full 결과:', result);
    } catch (error) {
      console.log('Full 취소:', error);
    }
  };

  // ========================================
  // Position 테스트
  // ========================================
  const handleCenterModal = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Center Modal',
        content: '중앙 위치 모달입니다.',
        position: 'center',
      });
      console.log('Center 결과:', result);
    } catch (error) {
      console.log('Center 취소:', error);
    }
  };

  const handleBottomModal = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Bottom Sheet',
        content: '하단 시트 모달입니다 (모바일용).',
        position: 'bottom',
        size: 'full',
      });
      console.log('Bottom 결과:', result);
    } catch (error) {
      console.log('Bottom 취소:', error);
    }
  };

  // ========================================
  // Tone 테스트
  // ========================================
  const handleDefaultTone = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Default Tone',
        content: '기본 톤의 모달입니다.',
        tone: 'default',
      });
      console.log('Default 결과:', result);
    } catch (error) {
      console.log('Default 취소:', error);
    }
  };

  const handleDangerTone = async () => {
    try {
      const result = await openModal<'confirm' | 'cancel'>(ConfirmModal, {
        title: '삭제 확인',
        message: '정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
        tone: 'danger',
        confirmText: '삭제',
        cancelText: '취소',
      });
      console.log('Danger 결과:', result);
    } catch (error) {
      console.log('Danger 취소:', error);
    }
  };

  const handleSuccessTone = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Success',
        content: '성공 톤의 모달입니다.',
        tone: 'success',
      });
      console.log('Success 결과:', result);
    } catch (error) {
      console.log('Success 취소:', error);
    }
  };

  const handleWarningTone = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Warning',
        content: '경고 톤의 모달입니다.',
        tone: 'warning',
      });
      console.log('Warning 결과:', result);
    } catch (error) {
      console.log('Warning 취소:', error);
    }
  };

  // ========================================
  // 옵션 테스트
  // ========================================
  const handleDisableBackdropClick = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'Backdrop Click Disabled',
        content: '배경 클릭으로 닫을 수 없습니다. 버튼을 눌러주세요.',
        disableBackdropClick: true,
      });
      console.log('DisableBackdrop 결과:', result);
    } catch (error) {
      console.log('DisableBackdrop 취소:', error);
    }
  };

  const handleDisableEscapeKey = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'ESC Key Disabled',
        content: 'ESC 키로 닫을 수 없습니다. 버튼을 눌러주세요.',
        disableEscapeKey: true,
      });
      console.log('DisableEscape 결과:', result);
    } catch (error) {
      console.log('DisableEscape 취소:', error);
    }
  };

  const handleBothDisabled = async () => {
    try {
      const result = await openModal<string>(CustomModal, {
        title: 'All Close Options Disabled',
        content: '배경 클릭과 ESC 키가 모두 비활성화되었습니다. 반드시 버튼을 눌러야 닫힙니다.',
        disableBackdropClick: true,
        disableEscapeKey: true,
        tone: 'danger',
      });
      console.log('BothDisabled 결과:', result);
    } catch (error) {
      console.log('BothDisabled 취소:', error);
    }
  };

  // ========================================
  // 고급 시나리오 테스트
  // ========================================
  const handleSequentialModals = async () => {
    try {
      // 첫 번째 모달
      const result1 = await openModal<'confirm' | 'cancel'>(ConfirmModal, {
        title: '1단계',
        message: '첫 번째 모달입니다. 계속하시겠습니까?',
      });

      if (result1 === 'confirm') {
        // 두 번째 모달
        const result2 = await openModal<'confirmed'>(AlertModal, {
          title: '2단계',
          message: '첫 번째 모달을 확인했습니다!',
        });

        // 세 번째 모달 (폼)
        const result3 = await openModal<{ name: string; email: string }>(FormModal, {
          title: '3단계',
        });

        // 마지막 확인 모달
        await openModal<'confirmed'>(AlertModal, {
          title: '완료',
          message: `모든 단계가 완료되었습니다!\n이름: ${result3.name}\n이메일: ${result3.email}`,
        });
      }
    } catch (error) {
      console.log('Sequential 취소:', error);
    }
  };

  const handleNestedModals = async () => {
    try {
      const result1 = await openModal<string>(CustomModal, {
        title: '부모 모달',
        content: '이 모달에서 다른 모달을 열 수 있습니다.',
      });
      console.log('Nested 결과:', result1);
    } catch (error) {
      console.log('Nested 취소:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900">Modal Component Test Page</h1>
          <p className="mt-2 text-gray-600">
            다양한 모달 기능을 테스트할 수 있습니다. 각 버튼을 클릭하여 테스트하세요.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            결과는 콘솔(F12)에서 확인할 수 있습니다.
          </p>
        </div>

        {/* 기본 모달 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            1. 기본 모달 타입
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={handleAlertModal} className="w-full">
              Alert Modal
            </Button>
            <Button onClick={handleConfirmModal} className="w-full">
              Confirm Modal
            </Button>
            <Button onClick={handleFormModal} className="w-full">
              Form Modal
            </Button>
          </div>
        </section>

        {/* Size 테스트 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Size Variants</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={handleSmallModal} intent="secondary" className="w-full">
              Small
            </Button>
            <Button onClick={handleMediumModal} intent="secondary" className="w-full">
              Medium
            </Button>
            <Button onClick={handleLargeModal} intent="secondary" className="w-full">
              Large
            </Button>
            <Button onClick={handleFullModal} intent="secondary" className="w-full">
              Full
            </Button>
          </div>
        </section>

        {/* Position 테스트 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            3. Position Variants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={handleCenterModal} intent="secondary" className="w-full">
              Center
            </Button>
            <Button onClick={handleBottomModal} intent="secondary" className="w-full">
              Bottom (Mobile)
            </Button>
          </div>
        </section>

        {/* Tone 테스트 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Tone Variants</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={handleDefaultTone} intent="secondary" className="w-full">
              Default
            </Button>
            <Button onClick={handleDangerTone} intent="danger" className="w-full">
              Danger
            </Button>
            <Button onClick={handleSuccessTone} intent="secondary" className="w-full">
              Success
            </Button>
            <Button onClick={handleWarningTone} intent="secondary" className="w-full">
              Warning
            </Button>
          </div>
        </section>

        {/* 옵션 테스트 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            5. Close Options
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={handleDisableBackdropClick} intent="secondary" className="w-full">
              Disable Backdrop Click
            </Button>
            <Button onClick={handleDisableEscapeKey} intent="secondary" className="w-full">
              Disable ESC Key
            </Button>
            <Button onClick={handleBothDisabled} intent="danger" className="w-full">
              Both Disabled
            </Button>
          </div>
        </section>

        {/* 고급 시나리오 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            6. Advanced Scenarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={handleSequentialModals} intent="primary" className="w-full">
              순차 모달 (4단계)
            </Button>
            <Button onClick={handleNestedModals} intent="primary" className="w-full">
              중첩 모달
            </Button>
          </div>
        </section>

        {/* 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">테스트 가이드</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li>• 각 버튼을 클릭하여 모달을 테스트하세요.</li>
            <li>• ESC 키나 배경 클릭으로 모달을 닫을 수 있습니다 (옵션에 따라 제한됨).</li>
            <li>• 브라우저 콘솔(F12)을 열어 모달의 반환값을 확인하세요.</li>
            <li>• "순차 모달"은 여러 모달을 차례로 표시합니다.</li>
            <li>• 모든 모달은 Promise 기반으로 동작하여 async/await로 결과를 받습니다.</li>
          </ul>
        </div>
      </div>

      {/* Modal 렌더링 */}
      {renderModal()}
    </div>
  );
}
