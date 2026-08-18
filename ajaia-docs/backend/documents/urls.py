from django.urls import path
from .views import (
    DocumentListCreateView,
    DocumentDetailView,
    ShareDocumentView,
    ImportFileView,
)

urlpatterns = [
    path('documents/', DocumentListCreateView.as_view(), name='document-list-create'),
    path('documents/<int:doc_id>/', DocumentDetailView.as_view(), name='document-detail'),
    path('documents/<int:doc_id>/share/', ShareDocumentView.as_view(), name='document-share'),
    path('documents/import/', ImportFileView.as_view(), name='document-import'),
]