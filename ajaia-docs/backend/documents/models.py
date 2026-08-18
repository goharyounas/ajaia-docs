from django.db import models

class User(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.email

class Document(models.Model):
    title = models.CharField(max_length=200, default='Untitled')
    content = models.TextField(default='<p></p>')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_documents')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class DocumentShare(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='shares')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_documents')

    class Meta:
        unique_together = ('document', 'user')

    def __str__(self):
        return f"{self.document.title} shared with {self.user.email}"