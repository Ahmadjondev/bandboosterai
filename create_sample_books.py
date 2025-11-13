"""
Script to add sample IELTS books with sections
"""

import os
import django

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mockexam.settings")
django.setup()

from books.models import Book, BookSection
from ielts.models import ReadingPassage, ListeningPart


def create_sample_books():
    print("Creating sample IELTS books...")

    # Book 1: Cambridge IELTS 15 (B2 Level)
    book1, created = Book.objects.get_or_create(
        title="Cambridge IELTS 15 - Academic",
        defaults={
            "description": "Complete collection of IELTS Academic practice tests from Cambridge. Perfect for B2 level students preparing for the exam.",
            "level": "B2",
            "author": "Cambridge University Press",
            "publisher": "Cambridge Assessment English",
            "total_sections": 4,
            "is_active": True,
        },
    )
    if created:
        print(f"✓ Created: {book1.title}")
    else:
        print(f"  Already exists: {book1.title}")

    # Add sections to Book 1
    if created or BookSection.objects.filter(book=book1).count() == 0:
        # Section 1: Reading
        BookSection.objects.create(
            book=book1,
            section_type="READING",
            reading_passage=ReadingPassage.objects.get(
                id=1
            ),  # Australian artist Margaret Preston
            order=1,
            is_locked=False,
        )
        print("  ✓ Added Reading Section 1")

        # Section 2: Listening
        BookSection.objects.create(
            book=book1,
            section_type="LISTENING",
            listening_part=ListeningPart.objects.get(id=1),  # Summer Fruit Picking Job
            order=2,
            is_locked=True,
        )
        print("  ✓ Added Listening Section 2")

        # Section 3: Reading
        BookSection.objects.create(
            book=book1,
            section_type="READING",
            reading_passage=ReadingPassage.objects.get(id=2),  # Ideal Homes
            order=3,
            is_locked=True,
        )
        print("  ✓ Added Reading Section 3")

        # Section 4: Listening
        BookSection.objects.create(
            book=book1,
            section_type="LISTENING",
            listening_part=ListeningPart.objects.get(id=2),  # Karrara Sports
            order=4,
            is_locked=True,
        )
        print("  ✓ Added Listening Section 4")

        # Update total sections
        book1.total_sections = 4
        book1.save()

    # Book 2: IELTS Trainer (C1 Level)
    book2, created = Book.objects.get_or_create(
        title="IELTS Trainer - Advanced Practice",
        defaults={
            "description": "Advanced IELTS preparation with challenging reading and listening materials for C1 level students.",
            "level": "C1",
            "author": "Louise Hashemi & Barbara Thomas",
            "publisher": "Cambridge University Press",
            "total_sections": 3,
            "is_active": True,
        },
    )
    if created:
        print(f"✓ Created: {book2.title}")
    else:
        print(f"  Already exists: {book2.title}")

    # Add sections to Book 2
    if created or BookSection.objects.filter(book=book2).count() == 0:
        # Section 1: Reading
        BookSection.objects.create(
            book=book2,
            section_type="READING",
            reading_passage=ReadingPassage.objects.get(id=3),  # Conformity
            order=1,
            is_locked=False,
        )
        print("  ✓ Added Reading Section 1")

        # Section 2: Listening
        BookSection.objects.create(
            book=book2,
            section_type="LISTENING",
            listening_part=ListeningPart.objects.get(id=3),  # House Prices Survey
            order=2,
            is_locked=True,
        )
        print("  ✓ Added Listening Section 2")

        # Section 3: Listening
        BookSection.objects.create(
            book=book2,
            section_type="LISTENING",
            listening_part=ListeningPart.objects.get(id=4),  # Drama Activities
            order=3,
            is_locked=True,
        )
        print("  ✓ Added Listening Section 3")

        # Update total sections
        book2.total_sections = 3
        book2.save()

    # Book 3: IELTS Foundation (B1 Level)
    book3, created = Book.objects.get_or_create(
        title="IELTS Foundation Skills - Reading & Listening",
        defaults={
            "description": "Foundation level practice materials for students starting their IELTS preparation journey. Focuses on building core skills.",
            "level": "B1",
            "author": "Rachael Roberts & Joanne Gakonga",
            "publisher": "Macmillan Education",
            "total_sections": 2,
            "is_active": True,
        },
    )
    if created:
        print(f"✓ Created: {book3.title}")
    else:
        print(f"  Already exists: {book3.title}")

    # Add sections to Book 3
    if created or BookSection.objects.filter(book=book3).count() == 0:
        # Section 1: Reading
        BookSection.objects.create(
            book=book3,
            section_type="READING",
            reading_passage=ReadingPassage.objects.get(id=1),  # Australian artist
            order=1,
            is_locked=False,
        )
        print("  ✓ Added Reading Section 1")

        # Section 2: Listening
        BookSection.objects.create(
            book=book3,
            section_type="LISTENING",
            listening_part=ListeningPart.objects.get(id=1),  # Summer Fruit Picking
            order=2,
            is_locked=True,
        )
        print("  ✓ Added Listening Section 2")

        # Update total sections
        book3.total_sections = 2
        book3.save()

    print("\n✅ Sample books creation completed!")
    print(f"Total books: {Book.objects.count()}")
    print(f"Total sections: {BookSection.objects.count()}")


if __name__ == "__main__":
    create_sample_books()
