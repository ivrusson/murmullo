import { Toast } from '@base-ui/react/toast';

export const toastManager = Toast.createToastManager();

type ToastOptions = {
  description?: string;
};

function add(type: string, title: string, options?: ToastOptions) {
  return toastManager.add({
    type,
    title,
    description: options?.description,
  });
}

export const toast = {
  success: (title: string, options?: ToastOptions) =>
    add('success', title, options),
  error: (title: string, options?: ToastOptions) =>
    add('error', title, options),
  info: (title: string, options?: ToastOptions) => add('info', title, options),
  message: (title: string, options?: ToastOptions) =>
    add('message', title, options),
};
