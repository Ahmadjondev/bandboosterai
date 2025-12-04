"""
Management command to create default subscription plans and attempt packages
"""

from django.core.management.base import BaseCommand
from payments.models import SubscriptionPlan, AttemptPackage


class Command(BaseCommand):
    help = "Create default subscription plans and attempt packages"

    def handle(self, *args, **options):
        self.create_subscription_plans()
        self.create_attempt_packages()
        self.stdout.write(
            self.style.SUCCESS("Successfully created default plans and packages")
        )

    def create_subscription_plans(self):
        """Create Plus, Pro, and Ultra subscription plans"""

        # -1 means unlimited attempts
        UNLIMITED = -1

        plans = [
            {
                "name": "Plus",
                "plan_type": "PLUS",
                "description": "Perfect for beginners. Unlimited reading & listening + 5 Writing/Speaking checks.",
                "price": 49000,  # 49,000 UZS
                "billing_period": "MONTHLY",
                "writing_attempts": 5,
                "speaking_attempts": 5,
                "reading_attempts": UNLIMITED,  # Unlimited
                "listening_attempts": UNLIMITED,  # Unlimited
                "book_access": False,
                "features": [
                    "Unlimited Premium Reading practice",
                    "Unlimited Premium Listening practice",
                    "5 Writing checks per month",
                    "5 Speaking practices per month",
                    "Basic progress tracking",
                    "Email support",
                ],
                "display_order": 1,
                "is_popular": False,
            },
            {
                "name": "Pro",
                "plan_type": "PRO",
                "description": "Most popular choice. Unlimited R/L + 15 Writing/Speaking checks + Premium Books.",
                "price": 99000,  # 99,000 UZS
                "billing_period": "MONTHLY",
                "writing_attempts": 15,
                "speaking_attempts": 15,
                "reading_attempts": UNLIMITED,  # Unlimited
                "listening_attempts": UNLIMITED,  # Unlimited
                "book_access": True,
                "features": [
                    "Unlimited Premium Reading practice",
                    "Unlimited Premium Listening practice",
                    "15 Writing checks per month",
                    "15 Speaking practices per month",
                    "Access to Premium Books",
                    "Detailed AI feedback",
                    "Advanced progress analytics",
                    "Priority email support",
                ],
                "display_order": 2,
                "is_popular": True,
            },
            {
                "name": "Ultra",
                "plan_type": "ULTRA",
                "description": "Ultimate preparation package. Unlimited everything for Band 8+ seekers.",
                "price": 199000,  # 199,000 UZS
                "billing_period": "MONTHLY",
                "writing_attempts": 50,
                "speaking_attempts": 50,
                "reading_attempts": UNLIMITED,  # Unlimited
                "listening_attempts": UNLIMITED,  # Unlimited
                "book_access": True,
                "features": [
                    "Unlimited Premium Reading practice",
                    "Unlimited Premium Listening practice",
                    "50 Writing checks per month",
                    "50 Speaking practices per month",
                    "Access to all Premium Books",
                    "Expert-level AI feedback",
                    "Personalized study plan",
                    "Band score prediction",
                    "24/7 Priority support",
                    "Exclusive practice materials",
                ],
                "display_order": 3,
                "is_popular": False,
            },
        ]

        for plan_data in plans:
            plan, created = SubscriptionPlan.objects.update_or_create(
                plan_type=plan_data["plan_type"],
                defaults=plan_data,
            )
            status = "Created" if created else "Updated"
            self.stdout.write(f"  {status}: {plan.name} plan - {plan.price:,.0f} UZS")

    def create_attempt_packages(self):
        """Create one-time purchase attempt packages"""

        packages = [
            # Writing packages - AI evaluation with detailed feedback
            {
                "name": "Writing Check - 1 attempt",
                "attempt_type": "WRITING",
                "description": "Single writing task evaluation with detailed AI feedback",
                "attempts_count": 1,
                "price": 5000,  # 5,000 UZS
                "display_order": 1,
            },
            {
                "name": "Writing Check - 5 attempts",
                "attempt_type": "WRITING",
                "description": "5 writing task evaluations with detailed AI feedback. Save 5,000 UZS!",
                "attempts_count": 5,
                "price": 20000,  # 20,000 UZS (save 5,000)
                "display_order": 2,
            },
            {
                "name": "Writing Check - 10 attempts",
                "attempt_type": "WRITING",
                "description": "10 writing task evaluations with detailed AI feedback. Best value!",
                "attempts_count": 10,
                "price": 35000,  # 35,000 UZS (save 15,000)
                "display_order": 3,
            },
            # Speaking packages - AI pronunciation & fluency evaluation
            {
                "name": "Speaking Practice - 1 attempt",
                "attempt_type": "SPEAKING",
                "description": "Single speaking practice session with AI evaluation",
                "attempts_count": 1,
                "price": 5000,
                "display_order": 4,
            },
            {
                "name": "Speaking Practice - 5 attempts",
                "attempt_type": "SPEAKING",
                "description": "5 speaking practice sessions with AI evaluation. Save 5,000 UZS!",
                "attempts_count": 5,
                "price": 20000,
                "display_order": 5,
            },
            {
                "name": "Speaking Practice - 10 attempts",
                "attempt_type": "SPEAKING",
                "description": "10 speaking practice sessions with AI evaluation. Best value!",
                "attempts_count": 10,
                "price": 35000,
                "display_order": 6,
            },
            # Premium Reading packages - for non-subscribers only
            {
                "name": "Premium Reading - 5 sections",
                "attempt_type": "READING",
                "description": "Access 5 premium reading sections with detailed explanations",
                "attempts_count": 5,
                "price": 10000,  # 10,000 UZS
                "display_order": 7,
            },
            {
                "name": "Premium Reading - 15 sections",
                "attempt_type": "READING",
                "description": "Access 15 premium reading sections. Save 5,000 UZS!",
                "attempts_count": 15,
                "price": 25000,  # 25,000 UZS
                "display_order": 8,
            },
            # Premium Listening packages - for non-subscribers only
            {
                "name": "Premium Listening - 5 sections",
                "attempt_type": "LISTENING",
                "description": "Access 5 premium listening sections with transcripts",
                "attempts_count": 5,
                "price": 10000,  # 10,000 UZS
                "display_order": 9,
            },
            {
                "name": "Premium Listening - 15 sections",
                "attempt_type": "LISTENING",
                "description": "Access 15 premium listening sections. Save 5,000 UZS!",
                "attempts_count": 15,
                "price": 25000,  # 25,000 UZS
                "display_order": 10,
            },
            # Mixed packages - best for beginners
            {
                "name": "Starter Pack",
                "attempt_type": "MIXED",
                "description": "Perfect starter pack: 3 Writing + 3 Speaking checks",
                "attempts_count": 0,  # Not used for mixed
                "writing_attempts": 3,
                "speaking_attempts": 3,
                "reading_attempts": 0,
                "listening_attempts": 0,
                "price": 25000,  # 25,000 UZS (save 5,000)
                "display_order": 11,
            },
            {
                "name": "Complete Practice Pack",
                "attempt_type": "MIXED",
                "description": "Full practice bundle: 10 Writing + 10 Speaking checks. Best value!",
                "attempts_count": 0,
                "writing_attempts": 10,
                "speaking_attempts": 10,
                "reading_attempts": 0,
                "listening_attempts": 0,
                "price": 65000,  # 65,000 UZS (save 35,000 vs individual)
                "display_order": 12,
            },
        ]

        for pkg_data in packages:
            # Handle mixed packages separately
            if pkg_data["attempt_type"] == "MIXED":
                pkg, created = AttemptPackage.objects.update_or_create(
                    name=pkg_data["name"],
                    attempt_type=pkg_data["attempt_type"],
                    defaults=pkg_data,
                )
            else:
                pkg, created = AttemptPackage.objects.update_or_create(
                    name=pkg_data["name"],
                    attempt_type=pkg_data["attempt_type"],
                    attempts_count=pkg_data["attempts_count"],
                    defaults=pkg_data,
                )
            status = "Created" if created else "Updated"
            self.stdout.write(f"  {status}: {pkg.name} - {pkg.price:,.0f} UZS")
