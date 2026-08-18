from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import User, Document, DocumentShare
import json

def get_user_by_email(email):
    try:
        return User.objects.get(email=email)
    except User.DoesNotExist:
        return None

class DocumentListCreateView(APIView):
    def get(self, request):
        email = request.query_params.get('user_email')
        if not email:
            return Response({'error': 'user_email required'}, status=status.HTTP_400_BAD_REQUEST)
        user = get_user_by_email(email)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        owned = Document.objects.filter(owner=user)
        shared_ids = DocumentShare.objects.filter(user=user).values_list('document_id', flat=True)
        shared = Document.objects.filter(id__in=shared_ids)

        def serialize_doc(doc, is_owner=True):
            return {
                'id': doc.id,
                'title': doc.title,
                'content': doc.content,
                'owner_email': doc.owner.email,
                'owner_name': doc.owner.name,
                'is_owner': is_owner,
                'updated_at': doc.updated_at.isoformat(),
            }

        owned_data = [serialize_doc(doc, True) for doc in owned]
        shared_data = [serialize_doc(doc, False) for doc in shared]
        return Response({'owned': owned_data, 'shared': shared_data})

    def post(self, request):
        data = json.loads(request.body)
        title = data.get('title', 'Untitled')
        content = data.get('content', '<p></p>')
        owner_email = data.get('owner_email')
        if not owner_email:
            return Response({'error': 'owner_email required'}, status=status.HTTP_400_BAD_REQUEST)
        user = get_user_by_email(owner_email)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        doc = Document.objects.create(title=title, content=content, owner=user)
        return Response({
            'id': doc.id,
            'title': doc.title,
            'content': doc.content,
            'owner_email': doc.owner.email,
            'is_owner': True,
            'updated_at': doc.updated_at.isoformat(),
        }, status=status.HTTP_201_CREATED)

class DocumentDetailView(APIView):
    def get(self, request, doc_id):
        doc = get_object_or_404(Document, id=doc_id)
        email = request.query_params.get('user_email')
        if not email:
            return Response({'error': 'user_email required'}, status=status.HTTP_400_BAD_REQUEST)
        user = get_user_by_email(email)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        is_owner = (doc.owner == user)
        has_share = DocumentShare.objects.filter(document=doc, user=user).exists()
        if not (is_owner or has_share):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            'id': doc.id,
            'title': doc.title,
            'content': doc.content,
            'owner_email': doc.owner.email,
            'is_owner': is_owner,
            'updated_at': doc.updated_at.isoformat(),
        })

    def put(self, request, doc_id):
        doc = get_object_or_404(Document, id=doc_id)
        data = json.loads(request.body)
        email = data.get('user_email')
        if not email:
            return Response({'error': 'user_email required'}, status=status.HTTP_400_BAD_REQUEST)
        user = get_user_by_email(email)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        is_owner = (doc.owner == user)
        has_share = DocumentShare.objects.filter(document=doc, user=user).exists()
        if not (is_owner or has_share):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        if 'title' in data:
            doc.title = data['title']
        if 'content' in data:
            doc.content = data['content']
        doc.save()
        return Response({
            'id': doc.id,
            'title': doc.title,
            'content': doc.content,
            'owner_email': doc.owner.email,
            'is_owner': is_owner,
            'updated_at': doc.updated_at.isoformat(),
        })

class ShareDocumentView(APIView):
    def post(self, request, doc_id):
        doc = get_object_or_404(Document, id=doc_id)
        data = json.loads(request.body)
        owner_email = data.get('owner_email')
        target_email = data.get('target_email')

        if not owner_email or not target_email:
            return Response({'error': 'owner_email and target_email required'}, status=status.HTTP_400_BAD_REQUEST)

        owner = get_user_by_email(owner_email)
        target = get_user_by_email(target_email)
        if not owner or not target:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if doc.owner != owner:
            return Response({'error': 'Only the owner can share this document'}, status=status.HTTP_403_FORBIDDEN)

        share, created = DocumentShare.objects.get_or_create(document=doc, user=target)
        if created:
            return Response({'message': f'Document shared with {target.email}'}, status=status.HTTP_201_CREATED)
        else:
            return Response({'message': 'Already shared with this user'}, status=status.HTTP_200_OK)

class ImportFileView(APIView):
    def post(self, request):
        file_obj = request.FILES.get('file')
        owner_email = request.POST.get('owner_email')
        if not file_obj or not owner_email:
            return Response({'error': 'file and owner_email required'}, status=status.HTTP_400_BAD_REQUEST)

        filename = file_obj.name.lower()
        if not (filename.endswith('.txt') or filename.endswith('.md')):
            return Response({'error': 'Only .txt and .md files are supported'}, status=status.HTTP_400_BAD_REQUEST)

        user = get_user_by_email(owner_email)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        content_bytes = file_obj.read()
        try:
            text_content = content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': 'File must be UTF-8 encoded'}, status=status.HTTP_400_BAD_REQUEST)

        title = file_obj.name.rsplit('.', 1)[0]
        html_content = f'<pre>{text_content}</pre>'

        doc = Document.objects.create(title=title, content=html_content, owner=user)
        return Response({
            'id': doc.id,
            'title': doc.title,
            'content': doc.content,
            'owner_email': doc.owner.email,
            'is_owner': True,
            'updated_at': doc.updated_at.isoformat(),
        }, status=status.HTTP_201_CREATED)