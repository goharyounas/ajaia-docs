from django.core.management.base import BaseCommand
from documents.models import User   # <-- changed from 'docs'

class Command(BaseCommand):
    help = 'Seed the database with test users'

    def handle(self, *args, **options):
        users_data = [
            {'email': 'alice@example.com', 'name': 'Alice'},
            {'email': 'bob@example.com', 'name': 'Bob'},
            {'email': 'charlie@example.com', 'name': 'Charlie'},
        ]
        for data in users_data:
            user, created = User.objects.get_or_create(email=data['email'], defaults={'name': data['name']})
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created user: {user.email}'))
            else:
                self.stdout.write(self.style.WARNING(f'User already exists: {user.email}'))