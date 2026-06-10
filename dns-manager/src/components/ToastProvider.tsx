import { toast } from 'sonner';

function showSuccess(message: string) {
  toast.success(message);
}

function showError(message: string) {
  toast.error(message);
}

function showWarning(message: string) {
  toast.warning(message);
}

function showInfo(message: string) {
  toast.info(message);
}

export { showSuccess, showError, showWarning, showInfo };
