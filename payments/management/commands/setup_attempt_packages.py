"""
Management command to set up default attempt packages with proper pricing.

Pricing Strategy (300-700 UZS per attempt based on volume):
- Small packages: ~700 UZS/attempt (low volume discount)
- Medium packages: ~500 UZS/attempt
- Large packages: ~350 UZS/attempt (bulk discount)
- XL packages: ~300 UZS/attempt (best value)
"""

from django.core.management.base import BaseCommand
from payments.models import AttemptPackage


class Command(BaseCommand):
    help = "Set up default attempt packages with proper pricing"

    def handle(self, *args, **options):
        # Define packages for each section type
        # Pricing: 300-700 UZS per attempt based on volume
        packages = [
            # ================== READING PACKAGES ==================
            {
                "name": "Reading - Starter",
                "attempt_type": "READING",
                "description": "Perfect for trying out premium reading sections",
                "attempts_count": 5,
                "reading_attempts": 5,
                "price": 3500,  # 700 UZS/attempt
                "display_order": 1,
            },
            {
                "name": "Reading - Basic",
                "attempt_type": "READING",
                "description": "10 premium reading practice sessions",
                "attempts_count": 10,
                "reading_attempts": 10,
                "price": 6000,  # 600 UZS/attempt
                "display_order": 2,
            },
            {
                "name": "Reading - Standard",
                "attempt_type": "READING",
                "description": "30 premium reading sessions - great value",
                "attempts_count": 30,
                "reading_attempts": 30,
                "price": 15000,  # 500 UZS/attempt
                "display_order": 3,
            },
            {
                "name": "Reading - Pro",
                "attempt_type": "READING",
                "description": "100 premium reading sessions - bulk discount",
                "attempts_count": 100,
                "reading_attempts": 100,
                "price": 40000,  # 400 UZS/attempt
                "display_order": 4,
            },
            # ================== LISTENING PACKAGES ==================
            {
                "name": "Listening - Starter",
                "attempt_type": "LISTENING",
                "description": "Perfect for trying out premium listening sections",
                "attempts_count": 5,
                "listening_attempts": 5,
                "price": 3500,  # 700 UZS/attempt
                "display_order": 10,
            },
            {
                "name": "Listening - Basic",
                "attempt_type": "LISTENING",
                "description": "10 premium listening practice sessions",
                "attempts_count": 10,
                "listening_attempts": 10,
                "price": 6000,  # 600 UZS/attempt
                "display_order": 11,
            },
            {
                "name": "Listening - Standard",
                "attempt_type": "LISTENING",
                "description": "30 premium listening sessions - great value",
                "attempts_count": 30,
                "listening_attempts": 30,
                "price": 15000,  # 500 UZS/attempt
                "display_order": 12,
            },
            {
                "name": "Listening - Pro",
                "attempt_type": "LISTENING",
                "description": "100 premium listening sessions - bulk discount",
                "attempts_count": 100,
                "listening_attempts": 100,
                "price": 40000,  # 400 UZS/attempt
                "display_order": 13,
            },
            # ================== WRITING PACKAGES ==================
            {
                "name": "Writing Check - Starter",
                "attempt_type": "WRITING",
                "description": "5 AI writing evaluations",
                "attempts_count": 5,
                "writing_attempts": 5,
                "price": 5000,  # 1000 UZS/attempt (AI evaluation is more expensive)
                "display_order": 20,
            },
            {
                "name": "Writing Check - Basic",
                "attempt_type": "WRITING",
                "description": "10 AI writing evaluations",
                "attempts_count": 10,
                "writing_attempts": 10,
                "price": 9000,  # 900 UZS/attempt
                "display_order": 21,
            },
            {
                "name": "Writing Check - Standard",
                "attempt_type": "WRITING",
                "description": "30 AI writing evaluations - best value",
                "attempts_count": 30,
                "writing_attempts": 30,
                "price": 24000,  # 800 UZS/attempt
                "display_order": 22,
            },
            {
                "name": "Writing Check - Pro",
                "attempt_type": "WRITING",
                "description": "100 AI writing evaluations - bulk discount",
                "attempts_count": 100,
                "writing_attempts": 100,
                "price": 70000,  # 700 UZS/attempt
                "display_order": 23,
            },
            # ================== SPEAKING PACKAGES ==================
            {
                "name": "Speaking - Starter",
                "attempt_type": "SPEAKING",
                "description": "5 AI speaking evaluations",
                "attempts_count": 5,
                "speaking_attempts": 5,
                "price": 5000,  # 1000 UZS/attempt (AI evaluation is more expensive)
                "display_order": 30,
            },
            {
                "name": "Speaking - Basic",
                "attempt_type": "SPEAKING",
                "description": "10 AI speaking evaluations",
                "attempts_count": 10,
                "speaking_attempts": 10,
                "price": 9000,  # 900 UZS/attempt
                "display_order": 31,
            },
            {
                "name": "Speaking - Standard",
                "attempt_type": "SPEAKING",
                "description": "30 AI speaking evaluations - best value",
                "attempts_count": 30,
                "speaking_attempts": 30,
                "price": 24000,  # 800 UZS/attempt
                "display_order": 32,
            },
            {
                "name": "Speaking - Pro",
                "attempt_type": "SPEAKING",
                "description": "100 AI speaking evaluations - bulk discount",
                "attempts_count": 100,
                "speaking_attempts": 100,
                "price": 70000,  # 700 UZS/attempt
                "display_order": 33,
            },
            # ================== MIXED PACKAGES (Best Value) ==================
            {
                "name": "All-in-One - Starter",
                "attempt_type": "MIXED",
                "description": "5 of each section type (20 total attempts)",
                "attempts_count": 20,
                "reading_attempts": 5,
                "listening_attempts": 5,
                "writing_attempts": 5,
                "speaking_attempts": 5,
                "price": 12000,  # 600 UZS/attempt
                "display_order": 40,
            },
            {
                "name": "All-in-One - Basic",
                "attempt_type": "MIXED",
                "description": "10 of each section type (40 total attempts)",
                "attempts_count": 40,
                "reading_attempts": 10,
                "listening_attempts": 10,
                "writing_attempts": 10,
                "speaking_attempts": 10,
                "price": 20000,  # 500 UZS/attempt
                "display_order": 41,
            },
            {
                "name": "All-in-One - Standard",
                "attempt_type": "MIXED",
                "description": "25 of each section type (100 total attempts) - Most Popular!",
                "attempts_count": 100,
                "reading_attempts": 25,
                "listening_attempts": 25,
                "writing_attempts": 25,
                "speaking_attempts": 25,
                "price": 40000,  # 400 UZS/attempt
                "display_order": 42,
            },
            {
                "name": "All-in-One - Pro",
                "attempt_type": "MIXED",
                "description": "50 of each section type (200 total attempts) - Best Value!",
                "attempts_count": 200,
                "reading_attempts": 50,
                "listening_attempts": 50,
                "writing_attempts": 50,
                "speaking_attempts": 50,
                "price": 60000,  # 300 UZS/attempt - Best discount
                "display_order": 43,
            },
            {
                "name": "All-in-One - Ultimate",
                "attempt_type": "MIXED",
                "description": "100 of each section type (400 total attempts) - Maximum Savings!",
                "attempts_count": 400,
                "reading_attempts": 100,
                "listening_attempts": 100,
                "writing_attempts": 100,
                "speaking_attempts": 100,
                "price": 100000,  # 250 UZS/attempt - Best discount possible
                "display_order": 44,
            },
        ]

        created_count = 0
        updated_count = 0

        for pkg_data in packages:
            pkg, created = AttemptPackage.objects.update_or_create(
                name=pkg_data["name"],
                defaults={
                    "attempt_type": pkg_data["attempt_type"],
                    "description": pkg_data["description"],
                    "attempts_count": pkg_data["attempts_count"],
                    "reading_attempts": pkg_data.get("reading_attempts", 0),
                    "listening_attempts": pkg_data.get("listening_attempts", 0),
                    "writing_attempts": pkg_data.get("writing_attempts", 0),
                    "speaking_attempts": pkg_data.get("speaking_attempts", 0),
                    "price": pkg_data["price"],
                    "display_order": pkg_data["display_order"],
                    "is_active": True,
                },
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created: {pkg.name} - {pkg.price:,.0f} UZS")
                )
            else:
                updated_count += 1
                self.stdout.write(f"Updated: {pkg.name} - {pkg.price:,.0f} UZS")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone! Created {created_count}, Updated {updated_count} packages"
            )
        )
