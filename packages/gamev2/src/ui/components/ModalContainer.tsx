import { TerritoriesModal } from './TerritoriesModal';
import { UnitsModal } from './UnitsModal';

export type OpenModal = 'territories' | 'units' | null;

type ModalContainerProps = {
  open: OpenModal;
  onDismiss: () => void;
  onSwitch: (target: Exclude<OpenModal, null>) => void;
};

export function ModalContainer({ open, onDismiss, onSwitch }: ModalContainerProps) {
  return (
    <>
      <TerritoriesModal
        isOpen={open === 'territories'}
        onDismiss={onDismiss}
        onSwitch={() => onSwitch('units')}
      />
      <UnitsModal
        isOpen={open === 'units'}
        onDismiss={onDismiss}
        onSwitch={() => onSwitch('territories')}
      />
    </>
  );
}
