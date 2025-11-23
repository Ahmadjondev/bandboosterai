"""
Performance Analysis Module for IELTS Mock Tests.
Analyzes user performance across Reading and Listening sections.
"""

from typing import Dict, List, Any, Tuple
from collections import defaultdict
from .models import Question, UserAnswer, TestHead, ListeningPart


# --- Constants for Analysis ---

STRENGTH_THRESHOLD = 0.80  # 80% accuracy to be considered a strength
WEAKNESS_THRESHOLD = 0.50  # 50% accuracy to be considered a weakness

# Actionable tips for different question types
IMPROVEMENT_TIPS = {
    # Reading
    "TFNG": "For True/False/Not Given, scan the passage for keywords from the statement. If you find conflicting information, it's False. If you find no information, it's Not Given.",
    "YNNG": "For Yes/No/Not Given, focus on the writer's opinion, not just facts. Identify the writer's claims and compare them to the statement.",
    "MH": "For Matching Headings, read the paragraph first to understand the main idea, then choose the heading that best summarizes it. Don't be distracted by individual keywords.",
    "MI": "For Matching Information, scan the paragraphs for specific details mentioned in the questions. The information might not be the main idea of the paragraph.",
    "SC": "For Sentence Completion, pay close attention to grammar. The completed sentence must be grammatically correct. The answer is usually taken directly from the text.",
    "MCQ": "For Multiple Choice, eliminate obviously incorrect options first. Then, carefully check the remaining options against the information in the passage.",
    "MCMA": "For Multiple Choice Multiple Answers, read all options carefully and select all that apply. Don't stop after finding one correct answer.",
    "SUC": "For Summary Completion, understand the overall meaning of the summary before filling gaps. Answers follow the order of the passage.",
    "NC": "For Note Completion, focus on key facts and details. Use correct word forms and stay within word limits.",
    "FCC": "For Flow Chart Completion, follow the process or sequence described in the passage step by step.",
    "TC": "For Table Completion, identify what information belongs in each cell based on categories and row/column headers.",
    "MF": "For Matching Features, identify key characteristics or attributes mentioned in the passage and match them correctly.",
    # Listening
    "FC": "For Form Completion, predict the type of information needed for each gap (e.g., a name, a number, a date) before you listen.",
    "ML": "For Map Labeling, familiarize yourself with the map layout and directional language (e.g., 'next to', 'opposite', 'on the corner'). Follow the speaker's directions step-by-step.",
    "DL": "For Diagram Labeling, understand the structure of the diagram before listening. Focus on spatial relationships and specific terminology.",
    "SNTFC": "For Summary/Note/Table/Flow-chart Completion, understand the context of the summary before listening. The answers will come in order in the audio.",
    # General
    "default": "Review the questions of this type you got wrong. Try to understand why the correct answer is right and why your answer was wrong. Practice this question type specifically.",
}


def analyze_reading_performance(
    reading_questions_qs, user_answers_map: Dict[int, str]
) -> Dict[str, Any]:
    """Analyzes performance on the Reading section by question type."""
    type_stats = defaultdict(lambda: {"correct": 0, "total": 0})

    for q in reading_questions_qs:
        question_type = q.test_head.get_question_type_display()
        user_answer = user_answers_map.get(q.id, "").strip()
        correct_answer = q.get_correct_answer() or ""

        # Handle MCMA with weighted scoring
        if (
            q.test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            user_sorted = "".join(sorted(user_answer.upper()))
            correct_sorted = "".join(sorted(correct_answer.upper()))

            if correct_answer:
                user_set = set(user_sorted)
                correct_set = set(correct_sorted)

                # Each correct answer in MCMA counts as a separate question
                correct_selections = len(user_set & correct_set)
                incorrect_selections = len(user_set - correct_set)
                score = max(0, correct_selections - incorrect_selections)
                max_score = len(correct_set)

                type_stats[question_type]["total"] += max_score
                type_stats[question_type]["correct"] += score
            else:
                type_stats[question_type]["total"] += 1
        else:
            # Regular question types
            is_correct = (
                user_answer.lower() == correct_answer.lower() and correct_answer != ""
            )
            type_stats[question_type]["total"] += 1
            if is_correct:
                type_stats[question_type]["correct"] += 1

    # Calculate accuracy for each type
    accuracy_by_type = {
        q_type: (stats["correct"] / stats["total"]) if stats["total"] > 0 else 0
        for q_type, stats in type_stats.items()
    }

    return {
        "type_stats": type_stats,
        "accuracy_by_type": accuracy_by_type,
    }


def analyze_listening_performance(
    listening_questions_qs, user_answers_map: Dict[int, str]
) -> Dict[str, Any]:
    """Analyzes performance on the Listening section by part and question type."""
    part_stats = defaultdict(lambda: {"correct": 0, "total": 0})
    type_stats = defaultdict(lambda: {"correct": 0, "total": 0})

    # Create a map from question_id to part_number
    question_to_part_map = {}
    for part in ListeningPart.objects.prefetch_related("test_heads__questions").all():
        for head in part.test_heads.all():
            for question in head.questions.all():
                question_to_part_map[question.id] = part.part_number

    for q in listening_questions_qs:
        part_num = question_to_part_map.get(q.id, 0)
        question_type = q.test_head.get_question_type_display()
        user_answer = user_answers_map.get(q.id, "").strip()
        correct_answer = q.get_correct_answer() or ""

        # Handle MCMA with weighted scoring
        if (
            q.test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            user_sorted = "".join(sorted(user_answer.upper()))
            correct_sorted = "".join(sorted(correct_answer.upper()))

            if correct_answer:
                user_set = set(user_sorted)
                correct_set = set(correct_sorted)

                # Each correct answer in MCMA counts as a separate question
                correct_selections = len(user_set & correct_set)
                incorrect_selections = len(user_set - correct_set)
                score = max(0, correct_selections - incorrect_selections)
                max_score = len(correct_set)

                if part_num:
                    part_stats[f"Part {part_num}"]["total"] += max_score
                    part_stats[f"Part {part_num}"]["correct"] += score

                type_stats[question_type]["total"] += max_score
                type_stats[question_type]["correct"] += score
            else:
                if part_num:
                    part_stats[f"Part {part_num}"]["total"] += 1
                type_stats[question_type]["total"] += 1
        else:
            # Regular question types
            is_correct = (
                user_answer.lower() == correct_answer.lower() and correct_answer != ""
            )

            if part_num:
                part_stats[f"Part {part_num}"]["total"] += 1
                if is_correct:
                    part_stats[f"Part {part_num}"]["correct"] += 1

            type_stats[question_type]["total"] += 1
            if is_correct:
                type_stats[question_type]["correct"] += 1

    # Calculate accuracies
    accuracy_by_part = {
        part: (stats["correct"] / stats["total"]) if stats["total"] > 0 else 0
        for part, stats in part_stats.items()
    }
    accuracy_by_type = {
        q_type: (stats["correct"] / stats["total"]) if stats["total"] > 0 else 0
        for q_type, stats in type_stats.items()
    }

    return {
        "part_stats": dict(sorted(part_stats.items())),
        "type_stats": type_stats,
        "accuracy_by_part": dict(sorted(accuracy_by_part.items())),
        "accuracy_by_type": accuracy_by_type,
    }


def identify_strengths_and_weaknesses(
    analysis_results: List[Dict[str, Any]],
) -> Dict[str, List[Dict[str, str]]]:
    """Identifies strengths and weaknesses from analysis of all sections."""
    strengths = []
    weaknesses = []

    for result in analysis_results:
        section_name = result.get("section_name", "")
        accuracy_by_type = result.get("accuracy_by_type", {})

        for q_type, accuracy in accuracy_by_type.items():
            if accuracy >= STRENGTH_THRESHOLD:
                strengths.append(
                    {
                        "area": f"{section_name} - {q_type}",
                        "accuracy": f"{accuracy * 100:.0f}%",
                        "message": f"Excellent performance in {q_type} questions!",
                    }
                )
            elif accuracy <= WEAKNESS_THRESHOLD:
                tip = IMPROVEMENT_TIPS.get(q_type, IMPROVEMENT_TIPS["default"])
                weaknesses.append(
                    {
                        "area": f"{section_name} - {q_type}",
                        "accuracy": f"{accuracy * 100:.0f}%",
                        "tip": tip,
                    }
                )

    # Check for listening focus drop
    listening_analysis = next(
        (r for r in analysis_results if r.get("section_name") == "Listening"), None
    )
    if listening_analysis and "accuracy_by_part" in listening_analysis:
        parts = listening_analysis["accuracy_by_part"]
        if len(parts) >= 2:
            part_accuracies = list(parts.values())
            # Check if accuracy drops significantly in later parts
            first_half_avg = (
                sum(part_accuracies[:2]) / 2 if len(part_accuracies) >= 2 else 0
            )
            second_half_avg = (
                sum(part_accuracies[2:]) / len(part_accuracies[2:])
                if len(part_accuracies) > 2
                else 0
            )

            if first_half_avg - second_half_avg > 0.20:  # 20% drop
                weaknesses.append(
                    {
                        "area": "Listening - Concentration",
                        "accuracy": f"{second_half_avg * 100:.0f}% (later parts)",
                        "tip": "Your concentration appears to drop in later parts of the listening test. Practice maintaining focus for the full duration. Take brief mental breaks between parts if needed.",
                    }
                )

    return {"strengths": strengths, "weaknesses": weaknesses}


def calculate_band_score(
    correct_count: int, total_count: int, section_type: str
) -> float:
    """
    Calculate IELTS band score based on correct answers.

    For standard IELTS tests (40 questions), uses official conversion tables.
    For custom tests with fewer questions, uses percentage-based scoring.

    Args:
        correct_count: Number of correct answers
        total_count: Total number of questions
        section_type: 'academic_reading' or 'listening'

    Returns:
        Band score (0.0 to 9.0)
    """
    if total_count == 0:
        return 0.0

    # Calculate percentage
    percentage = (correct_count / total_count) * 100

    # For small question counts (< 20), use percentage-based scoring
    # This is more accurate than normalizing to 40
    if correct_count == 40:
        return 9.0
    elif correct_count == 39:
        return 9.0
    elif correct_count == 38:
        return 8.5
    elif correct_count == 37:
        return 8.5
    elif correct_count == 36:
        return 8.0
    elif correct_count == 35:
        return 8.0
    elif correct_count == 34:
        return 7.5
    elif correct_count == 33:
        return 7.5
    elif correct_count == 32:
        return 7.5
    elif correct_count == 31:
        return 7.0
    elif correct_count == 30:
        return 7.0
    elif correct_count == 29:
        return 6.5
    elif correct_count == 28:
        return 6.5
    elif correct_count == 27:
        return 6.5
    elif correct_count == 26:
        if section_type == "listening":
            return 6.0
        return 6.5
    elif correct_count == 25:
        return 6.0
    elif correct_count == 24:
        return 6.0
    elif correct_count == 23:
        return 6.0
    elif correct_count == 22:
        return 5.5
    elif correct_count == 21:
        return 5.5
    elif correct_count == 20:
        return 5.5
    elif correct_count == 19:
        return 5.5
    elif correct_count == 18:
        return 5.5
    elif correct_count == 17:
        return 5.0
    elif correct_count == 16:
        return 5.0
    elif correct_count == 15:
        return 4.5
    elif correct_count == 14:
        return 4.5
    elif correct_count == 13:
        return 4.5
    elif correct_count == 12:
        return 4.0
    elif correct_count == 11:
        return 4.0
    elif correct_count == 10:
        return 4.0
    elif correct_count == 9:
        return 3.5
    elif correct_count == 8:
        return 3.5
    elif correct_count == 7:
        return 3.5
    elif correct_count == 6:
        return 3.0
    elif correct_count == 5:
        return 3.0
    elif correct_count == 4:
        return 2.5
    elif correct_count == 3:
        return 2.5
    elif correct_count == 2:
        return 2.5
    elif correct_count == 1:
        return 2.5
    elif correct_count == 0:
        return 0.0
    else:
        # Percentage to band score mapping
        if percentage >= 95:
            return 9.0
        elif percentage >= 90:
            return 8.5
        elif percentage >= 85:
            return 8.0
        elif percentage >= 80:
            return 7.5
        elif percentage >= 75:
            return 7.0
        elif percentage >= 70:
            return 6.5
        elif percentage >= 60:
            return 6.0
        elif percentage >= 50:
            return 5.5
        elif percentage >= 40:
            return 5.0
        elif percentage >= 30:
            return 4.5
        elif percentage >= 20:
            return 4.0
        elif percentage >= 15:
            return 3.5
        elif percentage >= 10:
            return 3.0
        elif percentage >= 5:
            return 2.5
        else:
            return 2.0

    # Standard IELTS band score conversion (out of 40 questions)
    # Used for tests with 20+ questions
    band_conversion = {
        "academic_reading": [
            (0, 0.0),
            (4, 2.5),
            (10, 3.5),
            (15, 4.5),
            (19, 5.0),
            (23, 5.5),
            (27, 6.0),
            (30, 6.5),
            (33, 7.0),
            (35, 7.5),
            (37, 8.0),
            (39, 8.5),
            (40, 9.0),
        ],
        "listening": [
            (0, 0.0),
            (4, 2.5),
            (10, 3.5),
            (16, 4.5),
            (19, 5.0),
            (23, 5.5),
            (26, 6.0),
            (30, 6.5),
            (32, 7.0),
            (34, 7.5),
            (36, 8.0),
            (38, 8.5),
            (40, 9.0),
        ],
    }

    # Normalize to 40 questions standard
    normalized_correct = (correct_count / total_count) * 40

    conversion_table = band_conversion.get(
        section_type.lower(), band_conversion["listening"]
    )

    # Find the band score
    for i in range(len(conversion_table) - 1):
        if (
            normalized_correct >= conversion_table[i][0]
            and normalized_correct < conversion_table[i + 1][0]
        ):
            # Linear interpolation between band scores
            lower_score = conversion_table[i][1]
            upper_score = conversion_table[i + 1][1]
            lower_correct = conversion_table[i][0]
            upper_correct = conversion_table[i + 1][0]

            ratio = (normalized_correct - lower_correct) / (
                upper_correct - lower_correct
            )
            band = lower_score + (upper_score - lower_score) * ratio
            return round(band * 2) / 2  # Round to nearest 0.5

    # If above highest threshold
    return conversion_table[-1][1]
