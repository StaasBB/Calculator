export class ToastView {
    static timeout = null;

    static show(message, type = 'default') {
        let toast = document.getElementById('rfab-toast');

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'rfab-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.className = '';
        toast.classList.add('visible');

        if (type) {
            toast.classList.add(type);
        }

        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2200);
    }
}