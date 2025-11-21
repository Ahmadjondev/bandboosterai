from django.core.management.base import BaseCommand
from ielts.models import ReadingPassage, ListeningPart, WritingTask, SpeakingTopic


class Command(BaseCommand):
    help = 'Check available content for mock tests'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== Content Availability Check ===\n'))
        
        # Reading Passages
        reading_count = ReadingPassage.objects.count()
        self.stdout.write(f'📖 Reading Passages: {reading_count}')
        if reading_count > 0:
            for i in [1, 2, 3]:
                count = ReadingPassage.objects.filter(passage_number=i).count()
                self.stdout.write(f'   - Passage {i}: {count} items')
        
        # Listening Parts
        listening_count = ListeningPart.objects.count()
        self.stdout.write(f'\n🎧 Listening Parts: {listening_count}')
        if listening_count > 0:
            for i in [1, 2, 3, 4]:
                count = ListeningPart.objects.filter(part_number=i).count()
                self.stdout.write(f'   - Part {i}: {count} items')
        
        # Writing Tasks
        writing_count = WritingTask.objects.count()
        self.stdout.write(f'\n✍️  Writing Tasks: {writing_count}')
        if writing_count > 0:
            task1 = WritingTask.objects.filter(task_type='TASK_1').count()
            task2 = WritingTask.objects.filter(task_type='TASK_2').count()
            self.stdout.write(f'   - Task 1: {task1} items')
            self.stdout.write(f'   - Task 2: {task2} items')
        
        # Speaking Topics
        speaking_count = SpeakingTopic.objects.count()
        self.stdout.write(f'\n💬 Speaking Topics: {speaking_count}')
        if speaking_count > 0:
            for i in [1, 2, 3]:
                count = SpeakingTopic.objects.filter(speaking_type=f'PART_{i}').count()
                self.stdout.write(f'   - Part {i}: {count} items')
        
        self.stdout.write('\n')
        
        total = reading_count + listening_count + writing_count + speaking_count
        if total == 0:
            self.stdout.write(self.style.WARNING('⚠️  No content found! You need to create content first.'))
            self.stdout.write('\nTo create content, use the manager panel:')
            self.stdout.write('  1. Login as manager/admin')
            self.stdout.write('  2. Go to Manager Dashboard')
            self.stdout.write('  3. Create Reading Passages, Listening Parts, etc.')
        else:
            self.stdout.write(self.style.SUCCESS('✅ Content is available!'))
            if reading_count == 0:
                self.stdout.write(self.style.WARNING('⚠️  No reading passages found'))
            if listening_count == 0:
                self.stdout.write(self.style.WARNING('⚠️  No listening parts found'))
            if writing_count == 0:
                self.stdout.write(self.style.WARNING('⚠️  No writing tasks found'))
            if speaking_count == 0:
                self.stdout.write(self.style.WARNING('⚠️  No speaking topics found'))
