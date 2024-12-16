document.addEventListener('alpine:init', () => {
    Alpine.data('loginHandler', () => ({
        formData: {
            email: '',
            password: ''
        },
        loading: false,
        error: null,

        async login() {
            this.loading = true;
            this.error = null;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.formData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }

                // Redirect to admin panel on success
                window.location.href = '/admin.html';
            } catch (error) {
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'same-origin'
                });

                if (!response.ok) {
                    throw new Error('Logout failed');
                }

                window.location.href = '/login.html';
            } catch (error) {
                console.error('Logout error:', error);
                this.error = error.message;
            }
        }
    }));
}); 