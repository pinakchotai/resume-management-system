document.addEventListener('alpine:init', () => {
    Alpine.data('formHandler', () => ({
        formData: {
            fullName: '',
            email: '',
            phone: '',
            experience: '',
            resume: null
        },
        loading: false,
        error: null,
        success: false,
        submissions: [],

        init() {
            if (window.location.pathname.includes('admin')) {
                this.loadSubmissions();
            }
        },

        async loadSubmissions() {
            try {
                const response = await fetch('/api/submissions');
                this.submissions = await response.json();
            } catch (error) {
                console.error('Error loading submissions:', error);
                this.error = 'Error loading submissions';
            }
        },

        validateFile(event) {
            const file = event.target.files[0];
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            const maxSize = 2 * 1024 * 1024; // 2MB

            if (!file) {
                this.error = 'Please select a file';
                return false;
            }

            if (!allowedTypes.includes(file.type)) {
                this.error = 'Invalid file type. Please upload PDF, DOC, or DOCX files only.';
                event.target.value = '';
                return false;
            }

            if (file.size > maxSize) {
                this.error = 'File size must be less than 2MB';
                event.target.value = '';
                return false;
            }

            this.formData.resume = file;
            this.error = null;
            return true;
        },

        async submitForm() {
            this.loading = true;
            this.error = null;
            this.success = false;

            try {
                const formData = new FormData();
                formData.append('fullName', this.formData.fullName);
                formData.append('email', this.formData.email);
                formData.append('phone', this.formData.phone);
                formData.append('experience', this.formData.experience);
                formData.append('resume', this.formData.resume);

                const response = await fetch('/api/submit', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Error submitting form');
                }

                this.success = true;
                this.resetForm();

            } catch (err) {
                this.error = err.message;
                console.error('Submission error:', err);
            } finally {
                this.loading = false;
            }
        },

        resetForm() {
            this.formData = {
                fullName: '',
                email: '',
                phone: '',
                experience: '',
                resume: null
            };
            document.querySelector('#resume').value = '';
        },

        async downloadResume(submissionId) {
            try {
                const response = await fetch(`/api/resume/${submissionId}`);
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error downloading resume');
                }
        
                // Get the filename from the response headers if available
                const contentDisposition = response.headers.get('content-disposition');
                const fileName = contentDisposition
                    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                    : 'resume';
        
                // Create blob from response
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                // Create temporary link and trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error('Download error:', error);
                alert('Error downloading resume: ' + error.message);
            }
        }
    }));
});