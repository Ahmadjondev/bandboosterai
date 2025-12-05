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
        """Create Plus, Pro, and Ultra subscription plans for all billing periods"""

        # -1 means unlimited attempts
        UNLIMITED = -1

        # Base plan configurations
        base_plans = {
            "PLUS": {
                "name": "Plus",
                "description": "Perfect for beginners. Unlimited reading & listening + 5 Writing/Speaking checks.",
                "monthly_price": 39900,  # 39,900 UZS
                "writing_attempts": 5,
                "speaking_attempts": 5,
                "reading_attempts": UNLIMITED,
                "listening_attempts": UNLIMITED,
                "cd_exam_attempts": 0,
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
            "PRO": {
                "name": "Pro",
                "description": "Most popular choice. Unlimited R/L + 15 Writing/Speaking checks + Premium Books + 1 Free CD Exam.",
                "monthly_price": 69900,  # 69,900 UZS
                "writing_attempts": 15,
                "speaking_attempts": 15,
                "reading_attempts": UNLIMITED,
                "listening_attempts": UNLIMITED,
                "cd_exam_attempts": 1,
                "book_access": True,
                "features": [
                    "Unlimited Premium Reading practice",
                    "Unlimited Premium Listening practice",
                    "15 Writing checks per month",
                    "15 Speaking practices per month",
                    "1 Free CD IELTS Exam",
                    "Access to Premium Books",
                    "Detailed AI feedback",
                    "Advanced progress analytics",
                    "Priority email support",
                ],
                "display_order": 2,
                "is_popular": True,
            },
            "ULTRA": {
                "name": "Ultra",
                "description": "Ultimate preparation package. Unlimited everything + 2 Free CD Exams for Band 8+ seekers.",
                "monthly_price": 99900,  # 99,900 UZS
                "writing_attempts": 50,
                "speaking_attempts": 50,
                "reading_attempts": UNLIMITED,
                "listening_attempts": UNLIMITED,
                "cd_exam_attempts": 2,
                "book_access": True,
                "features": [
                    "Unlimited Premium Reading practice",
                    "Unlimited Premium Listening practice",
                    "50 Writing checks per month",
                    "50 Speaking practices per month",
                    "2 Free CD IELTS Exams",
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
        }

        # Billing periods with their multipliers and discounts
        billing_periods = [
            {
                "period": "MONTHLY",
                "months": 1,
                "discount": 0,  # No discount
                "name_suffix": "",
            },
            {
                "period": "QUARTERLY",
                "months": 3,
                "discount": 0.10,  # 10% off
                "name_suffix": " (3 Months)",
            },
            {
                "period": "BIANNUAL",
                "months": 6,
                "discount": 0.20,  # 20% off
                "name_suffix": " (6 Months)",
            },
            {
                "period": "YEARLY",
                "months": 12,
                "discount": 0.30,  # 30% off
                "name_suffix": " (12 Months)",
            },
        ]

        display_order = 0
        for plan_type, base_plan in base_plans.items():
            for billing in billing_periods:
                display_order += 1

                # Calculate price with discount
                base_price = base_plan["monthly_price"] * billing["months"]
                discounted_price = base_price * (1 - billing["discount"])

                # Calculate attempts (multiply by months for longer periods)
                writing_attempts = base_plan["writing_attempts"]
                speaking_attempts = base_plan["speaking_attempts"]
                cd_exam_attempts = base_plan["cd_exam_attempts"]

                # For longer periods, multiply attempts (except unlimited)
                if billing["months"] > 1:
                    if writing_attempts > 0:
                        writing_attempts *= billing["months"]
                    if speaking_attempts > 0:
                        speaking_attempts *= billing["months"]
                    if cd_exam_attempts > 0:
                        cd_exam_attempts *= billing["months"]

                # Update features to reflect multiplied values
                features = base_plan["features"].copy()
                if billing["months"] > 1:
                    features = self._update_features_for_period(
                        features,
                        billing["months"],
                        writing_attempts,
                        speaking_attempts,
                        cd_exam_attempts,
                    )

                # Add savings info for discounted plans
                if billing["discount"] > 0:
                    savings = base_price - discounted_price
                    features.append(
                        f"Save {savings:,.0f} UZS ({int(billing['discount'] * 100)}% off)"
                    )

                plan_data = {
                    "name": f"{base_plan['name']}{billing['name_suffix']}",
                    "plan_type": plan_type,
                    "description": base_plan["description"],
                    "price": discounted_price,
                    "billing_period": billing["period"],
                    "writing_attempts": writing_attempts,
                    "speaking_attempts": speaking_attempts,
                    "reading_attempts": base_plan["reading_attempts"],
                    "listening_attempts": base_plan["listening_attempts"],
                    "cd_exam_attempts": cd_exam_attempts,
                    "book_access": base_plan["book_access"],
                    "features": features,
                    "display_order": display_order,
                    "is_popular": base_plan["is_popular"]
                    and billing["period"] == "MONTHLY",
                }

                plan, created = SubscriptionPlan.objects.update_or_create(
                    plan_type=plan_type,
                    billing_period=billing["period"],
                    defaults=plan_data,
                )
                status = "Created" if created else "Updated"
                self.stdout.write(
                    f"  {status}: {plan.name} ({billing['period']}) - {plan.price:,.0f} UZS"
                )

    def _update_features_for_period(
        self, features, months, writing, speaking, cd_exams
    ):
        """Update feature descriptions for longer billing periods"""
        updated = []
        for feature in features:
            if "Writing checks per month" in feature and writing > 0:
                updated.append(f"{writing} Writing checks total")
            elif "Speaking practices per month" in feature and speaking > 0:
                updated.append(f"{speaking} Speaking practices total")
            elif "Free CD IELTS Exam" in feature and cd_exams > 0:
                updated.append(f"{cd_exams} Free CD IELTS Exams")
            else:
                updated.append(feature)
        return updated

    def create_attempt_packages(self):
        """Create one-time purchase attempt packages"""

        packages = [
            # Writing packages - AI evaluation with detailed feedback
            {
                "name": "Writing Check - 5 attempts",
                "attempt_type": "WRITING",
                "description": "5 writing task evaluations with detailed AI feedback. Save 5,000 UZS!",
                "attempts_count": 5,
                "price": 5900,  # 5,900 UZS (save 5,000)
                "display_order": 2,
            },
            {
                "name": "Writing Check - 10 attempts",
                "attempt_type": "WRITING",
                "description": "10 writing task evaluations with detailed AI feedback. Best value!",
                "attempts_count": 10,
                "price": 9900,  # 9,900 UZS (save 15,000)
                "display_order": 3,
            },
            # Speaking packages - AI pronunciation & fluency evaluation
            {
                "name": "Speaking Practice - 5 attempts",
                "attempt_type": "SPEAKING",
                "description": "5 speaking practice sessions with AI evaluation. Save 5,000 UZS!",
                "attempts_count": 5,
                "price": 5900,  # 5,900 UZS (save 5,000)
                "display_order": 5,
            },
            {
                "name": "Speaking Practice - 10 attempts",
                "attempt_type": "SPEAKING",
                "description": "10 speaking practice sessions with AI evaluation. Best value!",
                "attempts_count": 10,
                "price": 9900,  # 9,900 UZS (save 15,000)
                "display_order": 6,
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
                "price": 6900,  # 6,900 UZS (save 5,000)
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
                "price": 15900,  # 15,900 UZS (save 35,000 vs individual)
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
