export const useToast = () => (msg) => console.log('Toast:', msg);
export const useConfirmation = () => ({ message, onConfirm }) => {
    console.log('Confirm:', message);
    onConfirm();
};
