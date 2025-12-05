"""
AI Content Generator for IELTS Mock Tests
Extracts and generates IELTS test content from PDF files using Gemini AI.
Adapted from BandBooster project for current IELTS Mock System.
"""

import json
from django.conf import settings
from ai.tools import generate_ai, change_to_json


def generate_reading_passages_from_pdf(pdf_bytes, pdf_mime_type="application/pdf"):
    """
    Extract reading passages WITH QUESTIONS from PDF and structure them for IELTS reading test.

    Args:
        pdf_bytes: PDF file content as bytes
        pdf_mime_type: MIME type of the PDF

    Returns:
        dict: Structured reading passage data with questions
    """
    prompt = """
You are an expert IELTS test content analyzer. Analyze this PDF document and extract IELTS Reading passages WITH their questions.

**CRITICAL JSON FORMATTING RULES - READ CAREFULLY:**
1. ALL newlines in passage content MUST be replaced with the escape sequence \\n (not literal newlines)
2. ALL double quotes (") within strings must be escaped as \\"
3. ALL single quotes (') within strings should remain as-is (they're valid in JSON strings)
4. ALL backslashes must be escaped: \\\\
5. NO trailing commas before closing } or ]
6. All brackets and braces must be properly closed
7. The "content" field must be a SINGLE LINE string with \\n for line breaks
8. Example of correct formatting:
   "content": "First paragraph here.\\nSecond paragraph.\\nText with \\"quoted\\" words."
   NOT: "content": "First paragraph
   Second paragraph" (this breaks JSON!)

**QUOTE ESCAPING IS CRITICAL:**
- If text contains: He said "hello"
- JSON should have: He said \\"hello\\"
- Example: "text": "She replied, \\"I don't know.\\" Then she left."

**ESSENTIAL: When extracting passage content:**
- Replace ALL actual line breaks with \\n
- Escape ALL double quotes with \\"
- Keep the text as ONE continuous string
- Preserve paragraph structure using \\n\\n for paragraph breaks
- Example: "Line one\\nLine two with \\"quotes\\"\\n\\nNew paragraph"

**PARAGRAPH LABELS (CRITICAL FOR IELTS READING):**
- IELTS passages often have paragraphs labeled with letters: A, B, C, D, E, F, G, etc.
- These labels MUST be preserved as they are referenced in questions (especially Matching Information and Matching Headings)
- Format paragraph labels as: <strong>A</strong>\\n (label in strong tags followed by newline)
- Then include the paragraph text on the next line
- Example: "<strong>A</strong>\\nTea has been consumed for thousands of years...\\n\\n<strong>B</strong>\\nThe British popularized tea drinking..."
- Labels are usually bold, on separate lines, or at the start of paragraphs
- Do NOT skip or ignore these labels - they are essential for question functionality

**DOT-BASED INPUT DETECTION:**
- PDFs may use dotted lines (......) or underscores (______) to represent blank spaces where answers should go
- Convert these to standardized format using ONLY the <input> tag WITHOUT any question numbers
- **CRITICAL**: Do NOT include question numbers like (1), (2), (3) in the text - they go ONLY in the questions array
- Examples:
  * "The capital is ......" → "The capital is <input>" (NOT "The capital is <input> (1)")
  * "Name: ______" → "Name: <input>" (NOT "Name: <input> (2)")
  * "Address: 45 ...... Street" → "Address: 45 <input> Street" (NOT "Address: 45 <input> (1) Street")
- Maintain surrounding context and punctuation
- Question numbering is handled automatically by the "order" field in the questions array

**PDF STRUCTURE HANDLING:**
- Preserve paragraph breaks and indentation in passage content
- Handle multi-column layouts by reading left-to-right, top-to-bottom
- Maintain question numbering even if PDF formatting is inconsistent
- Keep punctuation, spacing, and line breaks in questions and answers
- If questions are split across pages, merge them intelligently

**IMPORTANT INSTRUCTIONS:**
1. Identify IELTS Reading passages (typically 1-3 passages)
2. Extract the complete text of each passage WITH proper formatting
3. For every passage, create a concise, informative title that reflects the passage's main topic or storyline (even if the original PDF omits a title). Use the passage content itself to infer this title so it provides helpful context during review.
4. Extract ALL questions associated with each passage
5. Identify the question type for each question group
6. Extract answers for all questions (or mark as null if not provided)

**IELTS READING QUESTION TYPES:**
- **MCQ**: Multiple Choice (single answer)
- **MCMA**: Multiple Choice (multiple answers)
- **SA**: Short Answer
- **SC**: Sentence Completion - INDEPENDENT sentences (each sentence is separate and standalone)
- **TFNG**: True/False/Not Given
- **YNNG**: Yes/No/Not Given
- **MF**: Matching Features (match statements to options like names, theories, etc.)
- **MI**: Matching Information (match information to paragraphs)
- **MH**: Matching Headings (match headings to paragraphs/sections)
- **SUC**: Summary Completion - CONNECTED narrative (forms a cohesive paragraph/summary with multiple blanks)
  - **SUC with Word List**: "Complete the summary using the list of words, A-G, below" - has a predefined word bank
  - **SUC without Word List**: "Complete the summary using words from the passage" - free-form answers
- **NC**: Note Completion (complete notes with blanks)
- **FC**: Form Completion (fill in a form)
- **FCC**: Flow Chart Completion (complete a flow chart)
- **TC**: Table Completion (complete cells in a table)
- **DL**: Diagram Labelling (label parts of a diagram)
- **ML**: Map Labelling (label locations on a map)

**CRITICAL: SC vs SUC DISTINCTION - READ THIS CAREFULLY!**

⚠️ **COMMON MISTAKE**: PDFs may say "Complete the sentences" but if all sentences are about THE SAME TOPIC, it's SUC not SC!

Use **SUC (Summary Completion)** when:
- ✅ ALL sentences are about THE SAME TOPIC (e.g., all about trains, all about chocolate production, all about climate change)
- ✅ Sentences form a CONNECTED narrative that flows together
- ✅ Removing one sentence would break the coherence of the text
- ✅ Can be read as ONE cohesive paragraph
- ✅ Describes a unified concept, process, or topic
- **IMPORTANT**: Even if the PDF says "Complete the sentences", if they're all about the same topic → SUC!

**SUC Examples**:
1. Train technology (all about TGV/Japanese trains):
   "French TGV locomotives pull trains using ___. Japanese ground is unsuitable because ___. The electric system can act as ___. Electricity is produced by ___. Improvements come from ___."
   → All sentences about TRAIN SYSTEMS = SUC ✅

2. Chocolate production (all about making chocolate):
   "Chocolate is made from ___ which are ___. The process involves ___. Finally, chocolate is ___."
   → All sentences about CHOCOLATE PRODUCTION = SUC ✅

3. Climate change (all about environmental effects):
   "Global temperatures are rising due to ___. This causes ___. Scientists predict ___. Solutions include ___."
   → All sentences about CLIMATE = SUC ✅

Use **SC (Sentence Completion)** when:
- ❌ Each sentence is about a DIFFERENT topic (e.g., capitals, dates, prices)
- ❌ Sentences are INDEPENDENT facts that don't relate to each other
- ❌ Can reorder sentences without losing meaning
- ❌ Removing one sentence doesn't affect others

**SC Examples**:
1. Random facts (different topics):
   "The capital of France is ___. The experiment lasted ___. Mozart was born in ___. The temperature reached ___."
   → Different topics (geography, science, biography, weather) = SC ✅

2. Unrelated information:
   "The meeting is at ___. The book costs ___. The train leaves at ___."
   → Different facts about different things = SC ✅

**DECISION RULE**: 
🔍 Ask yourself: "Are ALL the sentences describing or explaining THE SAME thing/topic/concept?"
- YES → SUC (Summary Completion) ✅
- NO → SC (Sentence Completion) ✅

**DO NOT** be misled by the PDF title! "Complete the sentences" can still be SUC if sentences are thematically connected!

**SPECIAL NOTE ON MULTIPLE CHOICE MULTIPLE ANSWERS (MCMA):**
- MCMA questions allow students to select MORE THAN ONE correct answer
- Each correct answer counts as 1 question toward the 40-question total
- Example: If a MCMA question has 3 correct answers (A, C, E), it counts as 3 questions
- The "correct_answer" field should contain ALL correct letters concatenated: "ACE" (not "A, C, E")
- Format correct_answer WITHOUT spaces or commas: "AB", "ACD", "BCE", etc.
- Students receive partial credit: if they select 2 out of 3 correct answers, they get 2 points
- Use MCMA when:
  * The question explicitly asks to "Choose ALL correct answers"
  * Multiple answers are genuinely correct based on the passage
  * The instructions mention "more than one letter" or "several answers"
- MCMA questions typically have 2-5 correct answers (not just 1)
- Include 4-6 total choices with 2-5 being correct
- Example MCMA question:
  {
    "order": 15,
    "text": "Which of the following are mentioned as effects of climate change?",
    "correct_answer": "ABDE",
    "choices": [
      {"key": "A", "text": "Rising sea levels"},
      {"key": "B", "text": "More extreme weather"},
      {"key": "C", "text": "Decreased rainfall everywhere"},
      {"key": "D", "text": "Melting ice caps"},
      {"key": "E", "text": "Species extinction"}
    ]
  }

**SPECIAL NOTE ON MATCHING QUESTIONS (MI/MH/MF):**
- For MI (Matching Information) and MH (Matching Headings): If the passage has paragraph labels (A, B, C, D...), these become the options
- Automatically create options from paragraph labels: [{"value": "A", "label": "Paragraph A"}, {"value": "B", "label": "Paragraph B"}, ...]
- For MF (Matching Features): Extract explicit options from the question (e.g., names of people, theories, countries)
- If MI/MH questions don't have explicit options in the PDF, use the detected paragraph labels
- Example for MI with 6 labeled paragraphs:
  "question_data": {
    "options": [
      {"value": "A", "label": "Paragraph A"},
      {"value": "B", "label": "Paragraph B"},
      {"value": "C", "label": "Paragraph C"},
      {"value": "D", "label": "Paragraph D"},
      {"value": "E", "label": "Paragraph E"},
      {"value": "F", "label": "Paragraph F"}
    ]
  }

**SPECIAL NOTE ON MAP LABELLING (ML) QUESTIONS:**
- ML questions require students to label locations on a map/floor plan/diagram
- The map image itself is uploaded separately - the AI only extracts the structure
- **CRITICAL FORMAT** - Use this exact structure:
  "question_data": {
    "title": "Brief descriptive title of the map",
    "description": "Optional context (e.g., 'The map shows the layout of a university campus')",
    "labelCount": <number of locations to label>,
    "labels": [
      {"name": "Location name (what students see)", "correctAnswer": "Correct answer (letter/word)"},
      ...
    ],
    "note": "Image of map needs to be uploaded separately - map should have numbered locations"
  }
- **IMPORTANT**: Each label has TWO fields:
  * "name": The location/place name that students see (e.g., "Swimming Pool", "Library", "Main Entrance")
  * "correctAnswer": The correct answer students must write (usually a letter like "A", "H", or a word)
- Students see: "11. Swimming Pool _________" and must write the answer (e.g., "G")
- The "questions" array mirrors the labels with "text" = label name and "correct_answer" = correct answer
- Example ML structure:
  {
    "title": "Questions 11-14",
    "question_type": "ML",
    "description": "Label the map below. Write the correct letter, A-H, next to questions 11-14.",
    "question_data": {
      "title": "University Campus Map",
      "description": "The map shows the main buildings on campus",
      "labelCount": 4,
      "labels": [
        {"name": "Library", "correctAnswer": "C"},
        {"name": "Sports Center", "correctAnswer": "F"},
        {"name": "Cafeteria", "correctAnswer": "A"},
        {"name": "Parking Lot", "correctAnswer": "E"}
      ],
      "note": "Image of map needs to be uploaded separately"
    },
    "questions": [
      {"order": 11, "text": "Library", "correct_answer": "C"},
      {"order": 12, "text": "Sports Center", "correct_answer": "F"},
      {"order": 13, "text": "Cafeteria", "correct_answer": "A"},
      {"order": 14, "text": "Parking Lot", "correct_answer": "E"}
    ]
  }
- The map image with numbered locations (11, 12, 13, 14) must be uploaded manually by the teacher
- Extract location names from the PDF (e.g., "library", "gym", "cafe", "parking")
- Extract correct answers if provided in an answer key (often letters A-H or words)
- If no answer key exists, you can infer likely answers or leave placeholder values

**SPECIAL NOTE ON SUMMARY COMPLETION WITH WORD LIST (SUC with word_list):**
This is a common IELTS question type: "Complete the summary using the list of words, A-G, below."

**How to detect SUC with Word List:**
- Look for instructions like:
  * "Complete the summary using the list of words, A-G, below"
  * "Choose your answers from the box below"
  * "Select from the following options"
  * A visible word bank/box with lettered options (A-G, A-H, A-I, etc.)
- There will be a summary paragraph with blanks (numbered gaps)
- A separate box/list showing word options with letters (A, B, C, D, E, F, G...)

**Structure for SUC with Word List:**
- question_type: "SUC"
- question_data MUST include "word_list" array when a word bank is present
- Each word in word_list has "key" (letter) and "text" (the word/phrase)
- The "text" field contains the summary with <input> tags for blanks
- correct_answer for each question should be the letter (A, B, C, etc.)

**Example SUC with Word List:**
```json
{
  "title": "Questions 27-32",
  "question_type": "SUC",
  "description": "Complete the summary using the list of words, A-G, below.",
  "question_data": {
    "title": "The Development of Agriculture",
    "text": "Early humans began farming around <input> years ago. They first cultivated <input> crops in the Fertile Crescent. The invention of the <input> revolutionized farming practices. This led to <input> and the growth of cities.",
    "blankCount": 4,
    "word_list": [
      {"key": "A", "text": "10,000"},
      {"key": "B", "text": "cereal"},
      {"key": "C", "text": "plough"},
      {"key": "D", "text": "surplus food"},
      {"key": "E", "text": "irrigation"},
      {"key": "F", "text": "domestication"},
      {"key": "G", "text": "trade routes"}
    ]
  },
  "questions": [
    {"order": 27, "question_text": "Early humans began farming around <input> years ago.", "correct_answer": "A"},
    {"order": 28, "question_text": "They first cultivated <input> crops", "correct_answer": "B"},
    {"order": 29, "question_text": "The invention of the <input> revolutionized", "correct_answer": "C"},
    {"order": 30, "question_text": "This led to <input> and the growth", "correct_answer": "D"}
  ]
}
```

**CRITICAL RULES for SUC with Word List:**
1. ALWAYS include "word_list" in question_data when word options are provided
2. Extract ALL words from the word bank exactly as written
3. correct_answer must be the LETTER (A, B, C...) not the word itself
4. Some words in the word_list may NOT be used (there are often extra options)
5. Preserve the exact spelling and case of words from the PDF
6. word_list letters are typically consecutive (A-G, A-H, etc.)

**OUTPUT FORMAT - Return a valid JSON object with this EXACT structure:**

**⚠️ CRITICAL RULE FOR INPUT FIELDS IN question_data.items:**
- In the "items" array or similar structures, use ONLY <input> tags WITHOUT question numbers
- DO NOT add question numbers like (1), (2), (3) after <input> tags in text/items
- Question numbers belong ONLY in the "questions" array's "order" field
- CORRECT: "Name: <input>"
- WRONG: "Name: <input> (1)" ❌
- CORRECT: "The capital is <input>"
- WRONG: "The capital is <input> (1)" ❌

**⚠️ EXAMPLE QUESTIONS (IMPORTANT):**
- IELTS materials often include EXAMPLE questions before the actual questions
- Examples are typically marked with "Example", "e.g.", or "0" as the question number
- Examples show students how to answer the question type
- Extract examples when present and include them in the "example" field
- Example structure: {"question": "Example question text", "answer": "Example answer", "explanation": "Why this is the answer (optional)"}
- If no example is provided, set "example": null

{
    "success": true,
    "content_type": "reading",
    "passages": [
        {
            "passage_number": 1,
            "title": "The History of Tea",
            "summary": "This passage explores the origins and global spread of tea consumption.",
            "content": "<strong>A</strong>\\nTea has been consumed for thousands of years in Asia, with its origins traced to ancient China. The beverage became an integral part of Chinese culture and medicine.\\n\\n<strong>B</strong>\\nThe British popularized tea drinking during the colonial period, establishing vast plantations in India and Ceylon. Tea became Britain's national drink by the 19th century.\\n\\n<strong>C</strong>\\nModern tea production uses advanced machinery, but traditional methods are still valued for premium varieties. Organic and fair-trade teas have gained popularity in recent decades.",
            "question_groups": [
                {
                    "title": "Questions 1-3",
                    "question_type": "MI",
                    "description": "Which paragraph contains the following information?",
                    "example": {
                        "question": "A reference to the medicinal use of tea",
                        "answer": "A",
                        "explanation": "Paragraph A mentions that tea became an integral part of Chinese medicine."
                    },
                    "question_data": {
                        "options": [
                            {"value": "A", "label": "Paragraph A"},
                            {"value": "B", "label": "Paragraph B"},
                            {"value": "C", "label": "Paragraph C"}
                        ]
                    },
                    "questions": [
                        {
                            "order": 1,
                            "text": "The introduction of tea to Western countries",
                            "correct_answer": "B"
                        },
                        {
                            "order": 2,
                            "text": "The historical origins of tea consumption",
                            "correct_answer": "A"
                        },
                        {
                            "order": 3,
                            "text": "Contemporary trends in tea production",
                            "correct_answer": "C"
                        }
                    ]
                },
                {
                    "title": "Questions 4-8",
                    "question_type": "MCQ",
                    "description": "Choose the correct letter, A, B, C or D.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 4,
                            "text": "What is the main topic of the passage?",
                            "correct_answer": "A",
                            "choices": [
                                {"key": "A", "text": "The history of tea"},
                                {"key": "B", "text": "Modern tea production"},
                                {"key": "C", "text": "Health benefits of tea"},
                                {"key": "D", "text": "Tea recipes"}
                            ]
                        }
                    ]
                },
                {
                    "title": "Questions 5-7",
                    "question_type": "MCMA",
                    "description": "Choose ALL the correct answers, A, B, C, D or E. (Multiple answers possible)",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 5,
                            "text": "Which of the following are mentioned as benefits of tea drinking?",
                            "correct_answer": "ACE",
                            "choices": [
                                {"key": "A", "text": "Health benefits"},
                                {"key": "B", "text": "Weight loss guarantees"},
                                {"key": "C", "text": "Cultural significance"},
                                {"key": "D", "text": "Cures all diseases"},
                                {"key": "E", "text": "Social importance"}
                            ]
                        }
                    ]
                },
                {
                    "title": "Questions 9-13",
                    "question_type": "TFNG",
                    "description": "Do the following statements agree with the information in the passage?",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 9,
                            "text": "Tea was first discovered in South America.",
                            "correct_answer": "FALSE"
                        },
                        {
                            "order": 10,
                            "text": "What are the main tea-producing countries?",
                            "correct_answer": "China|India|Sri Lanka"
                        }
                    ]
                },
                {
                    "title": "Questions 11-15",
                    "question_type": "MF",
                    "description": "Match each statement with the correct person.",
                    "question_data": {
                        "options": [
                            {"value": "A", "label": "John Smith"},
                            {"value": "B", "label": "Mary Johnson"},
                            {"value": "C", "label": "Robert Brown"}
                        ]
                    },
                    "questions": [
                        {
                            "order": 11,
                            "text": "Discovered the health benefits of chocolate",
                            "correct_answer": "A"
                        }
                    ]
                },
                {
                    "title": "Questions 16-20",
                    "question_type": "SUC",
                    "description": "Complete the summary below using words from the passage. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "title": "The Production of Chocolate",
                        "text": "Chocolate is made from cacao beans which are <input> and then <input>. The process involves several steps including <input> and <input>. Finally, the chocolate is <input> and packaged.",
                        "blankCount": 5
                    },
                    "questions": [
                        {
                            "order": 16,
                            "question_text": "Chocolate is made from cacao beans which are <input> and then",
                            "correct_answer": "harvested"
                        },
                        {
                            "order": 17,
                            "question_text": "which are harvested and then <input>. The process involves several steps",
                            "correct_answer": "roasted"
                        },
                        {
                            "order": 18,
                            "question_text": "The process involves several steps including <input> and grinding",
                            "correct_answer": "fermentation"
                        },
                        {
                            "order": 19,
                            "question_text": "several steps including fermentation and <input>. Finally, the chocolate",
                            "correct_answer": "grinding"
                        },
                        {
                            "order": 20,
                            "question_text": "and grinding. Finally, the chocolate is <input> and packaged.",
                            "correct_answer": "tempered"
                        }
                    ]
                },
                {
                    "title": "Questions 36-40",
                    "question_type": "SUC",
                    "description": "Complete the summary using the list of words, A-I, below.",
                    "question_data": {
                        "title": "High-Speed Rail Technology",
                        "text": "The French TGV system uses <input> to pull trains from both ends. In Japan, the ground is unsuitable for this approach because it contains too much <input>. The Japanese system can also act as a <input> during emergencies. Modern improvements have been made possible by advances in <input> technology. The electricity needed is primarily generated by <input>.",
                        "blankCount": 5,
                        "word_list": [
                            {"key": "A", "text": "electricity"},
                            {"key": "B", "text": "locomotives"},
                            {"key": "C", "text": "clay"},
                            {"key": "D", "text": "brake"},
                            {"key": "E", "text": "computer"},
                            {"key": "F", "text": "nuclear power"},
                            {"key": "G", "text": "suspension"},
                            {"key": "H", "text": "wheels"},
                            {"key": "I", "text": "magnetism"}
                        ]
                    },
                    "questions": [
                        {
                            "order": 36,
                            "question_text": "The French TGV system uses <input> to pull trains",
                            "correct_answer": "B"
                        },
                        {
                            "order": 37,
                            "question_text": "the ground is unsuitable because it contains too much <input>",
                            "correct_answer": "C"
                        },
                        {
                            "order": 38,
                            "question_text": "The Japanese system can also act as a <input> during emergencies",
                            "correct_answer": "D"
                        },
                        {
                            "order": 39,
                            "question_text": "improvements have been made possible by advances in <input> technology",
                            "correct_answer": "E"
                        },
                        {
                            "order": 40,
                            "question_text": "The electricity needed is primarily generated by <input>",
                            "correct_answer": "F"
                        }
                    ]
                },
                {
                    "title": "Questions 21-25",
                    "question_type": "SC",
                    "description": "Complete the sentences below using NO MORE THAN THREE WORDS from the passage.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 21,
                            "text": "The capital of France is <input>.",
                            "correct_answer": "Paris"
                        },
                        {
                            "order": 22,
                            "text": "The author was born in <input>.",
                            "correct_answer": "London"
                        },
                        {
                            "order": 23,
                            "text": "The experiment lasted for <input>.",
                            "correct_answer": "three weeks"
                        }
                    ]
                },
                {
                    "title": "Questions 21-25",
                    "question_type": "SA",
                    "description": "Answer the questions below using NO MORE THAN THREE WORDS.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 21,
                            "text": "Where did chocolate originate?",
                            "correct_answer": "Central America"
                        }
                    ]
                },
                {
                    "title": "Questions 26-29",
                    "question_type": "TC",
                    "description": "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "items": [
                            ["Name of restaurant", "Location", "Reason for recommendation", "Other comments"],
                            ["The Junction", "Greyson Street, near the station", "Good for people who are especially keen on <input>", ["Quite expensive", "The <input> is a good place for a drink"]],
                            ["Paloma", "In Bow Street next to the cinema", "<input> food, good for sharing", ["Staff are very friendly", "Need to pay £50 deposit", "A limited selection of <input> food on the menu"]],
                            ["The <input>", "At the top of a <input>", ["A famous chef", "All the <input> are very good", "Only uses <input> ingredients"], ["Set lunch costs £<input> per person", "Portions probably of <input> size"]]
                        ]
                    },
                    "questions": [
                        {"order": 26, "text": "The Junction - Reason for recommendation (food type)", "correct_answer": "seafood"},
                        {"order": 27, "text": "The Junction - Other comments (location for drinks)", "correct_answer": "garden"},
                        {"order": 28, "text": "Paloma - Reason for recommendation (type of cuisine)", "correct_answer": "Spanish"},
                        {"order": 29, "text": "Paloma - Other comments (type of food selection)", "correct_answer": "vegetarian"}
                    ]
                },
                {
                    "title": "Questions 30-35",
                    "question_type": "NC",
                    "description": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "title": "Urban River Development",
                        "items": [
                            {
                                "title": "Historical Background",
                                "items": [
                                    "Cities built on rivers for transport and trade",
                                    {
                                        "prefix": "Industrial era problems:",
                                        "items": [
                                            "increased sewage discharge",
                                            "pollution from <input>  on riverbanks"
                                        ]
                                    },
                                    "Thames declared biologically <input> in 1957"
                                ]
                            },
                            {
                                "title": "Modern Improvements",
                                "items": [
                                    "Wildlife returned including <input> species",
                                    "Old warehouses converted to <input>",
                                    "Cities create riverside <input> for recreation"
                                ]
                            }
                        ]
                    },
                    "questions": [
                        {"order": 30, "text": "factories", "correct_answer": "factories"},
                        {"order": 31, "text": "dead", "correct_answer": "dead"},
                        {"order": 32, "text": "rare", "correct_answer": "rare"},
                        {"order": 33, "text": "apartments", "correct_answer": "apartments"},
                        {"order": 34, "text": "parks", "correct_answer": "parks"}
                    ]
                }
            ]
        }
    ],
    "metadata": {
        "total_passages": 1,
        "total_questions": 34,
        "estimated_difficulty": "medium",
        "topics": ["history", "food science", "urban development"],
        "has_answer_key": true,
        "formatting_quality": "good"
    }
}

**METADATA EXTRACTION:**
- estimated_difficulty: "easy", "medium", "hard" based on passage complexity and question types
- topics: Array of main topics covered (e.g., "science", "history", "technology", "environment")
- has_answer_key: true if answers are found in PDF, false if missing
- formatting_quality: "excellent", "good", "fair", "poor" based on PDF structure

**VALIDATION RULES:**
- passage_number must be 1, 2, or 3
- content must be COMPLETE passage text (minimum 500 words per passage)
- Each question MUST have order, and correct_answer (use null if answer not found in PDF)
- **MULTIPLE CORRECT ANSWERS**: If a question has multiple correct answers, join them with pipe separator | (e.g., "answer1|answer2|answer3"). DO NOT use commas, semicolons, or other separators.
- For MCQ/MCMA: Include choices array with key and text. Each question needs "text" and "correct_answer"
- For MF/MI/MH: Include options in question_data. Each question needs "text" and "correct_answer"
- For SUC: Include "title", "text" (with <input> for blanks), and "blankCount" in question_data. **If a word bank is provided**, include "word_list" array with {"key": "A", "text": "word"} objects. correct_answer should be the LETTER (A, B, C) when word_list exists, or the actual word when no word_list.
- For NC/FC: Include text or items structure in question_data. Each question needs "text" and "correct_answer"
- For TC: Include "items" array in question_data. First row is headers, subsequent rows are data with <input> for blanks. Cells can be strings or arrays (for multi-line cells). Each question needs "text" (cell description) and "correct_answer"
- For FCC/DL/ML: Include appropriate structure in question_data. Each question needs "text" and "correct_answer"
- For SA/SC/TFNG/YNNG: Each question needs "text" and "correct_answer"
- For NC: Use NESTED structure with title and items array. Items can be strings or objects with "prefix" and nested "items". Mark blanks with <input> followed by question number in parentheses.
- question_type must match one of the 16 types listed above
- **MISSING ANSWERS**: If answer key is not in PDF, set correct_answer to null and set has_answer_key: false in metadata
- **CRITICAL JSON REQUIREMENTS:**
  * Return ONLY valid JSON - no trailing commas
  * Properly escape quotes and special characters in strings
  * Ensure ALL brackets and braces are properly closed
  * NO trailing commas before closing } or ]
  * Validate your JSON before responding

**QUESTION EXTRACTION TIPS:**

⚠️ **CRITICAL WARNING - MOST COMMON MISTAKE**: 
The PDF title "Complete the sentences" does NOT automatically mean SC!
**If all sentences are about THE SAME TOPIC → it's SUC, not SC!**

**REAL EXAMPLE** that is SUC (not SC):
PDF shows: "Questions 36-40: Complete the sentences below"
- "French TGV locomotives pull trains from both ends using a ___"
- "Japanese ground is unsuitable for TGV because it is ___"
- "The Japanese electric car system can act as a ___"
- "Electricity is still produced by ___"
- "Improvements have been made possible by advances in ___"

This is **SUC** because:
✅ ALL sentences about train technology (TGV vs Japanese systems)
✅ Forms connected narrative comparing two train systems
✅ Cannot reorder without losing meaning
✅ Describes ONE unified topic (high-speed rail technology)

**Classification**: SUC with question_data containing the full connected paragraph!

---

- Questions usually appear after the passage
- Look for "Questions 1-5", "Questions 6-10" patterns
- Match question numbers with the text
- For matching questions, extract both the statements and the options
- For MI (Matching Information) and MH (Matching Headings): If no explicit options are listed, use paragraph labels (A, B, C...) as options
- For MF (Matching Features): Extract explicit options from the question text (names, theories, locations, etc.)
- For completion questions, identify blanks marked with numbers or underscores
- **CRITICAL: Distinguishing SC vs SUC**:
  * **STEP 1**: Read all sentences and ask: "Are they all about the SAME topic?"
  * **STEP 2**: If YES → SUC. If NO → SC.
  * **STEP 3**: Ignore the PDF title - "Complete the sentences" can be SUC!
  * **SC**: Each sentence is independent, different topics
    - Example: "The capital is ___." / "The author lived in ___." / "The experiment lasted ___."
    - Topics: geography, biography, science (ALL DIFFERENT) = SC ✅
  * **SUC**: All sentences about same topic, connected narrative
    - Example: "French TGV uses ___. Japanese trains differ because ___. The system provides ___."
    - Topic: Train technology (ALL SAME) = SUC ✅
  * **Golden rule**: Same topic throughout = SUC. Different topics = SC.
- **For SUC (Summary Completion)**: 
  * Extract the complete summary text with <input> tags for blanks
  * Count total blanks and set "blankCount" in question_data
  * For each question, include "question_text" with surrounding context (about 50-80 characters before and after the blank)
  * Example: "...which are harvested and then <input>. The process involves..." (shows context around blank)
  * Use "correct_answer" field (not "correct_answer_text")
  * The context helps students locate the blank in the full summary
- **For SC (Sentence Completion)**:
  * Each question has its own independent sentence with <input> tag
  * Store the complete sentence in the "text" field
  * Example: "The capital of France is <input>."
  * No need for "question_data" structure - just individual questions
- **For NC (Note Completion)**: Extract hierarchical note structure with sections, subsections, and nested bullet points. Use <input> for blanks with question numbers in parentheses. Support 2-3 levels of nesting with "title", "prefix", and "items" arrays.
- **For FC (Form Completion)**: Similar to NC but typically flat structure representing form fields
- **For TC (Table Completion)**:
  * Extract table structure as 2D array in "items" field of question_data
  * First row (index 0) contains column headers: ["Header1", "Header2", "Header3", ...]
  * Subsequent rows contain data with <input> tags for blanks
  * Each cell can be:
    - String: "Simple text" or "Text with <input>"
    - Array: ["Line 1", "Line 2", "Text with <input>"] for multi-line cells
  * Example structure:
    "items": [
      ["Name", "Location", "Price"],  // Headers
      ["Restaurant A", "Main St", "<input>"],  // Row 1
      ["The <input>", "<input> Street", ["$25", "Includes <input>"]]  // Row 2 with multi-line cell
    ]
  * Each question has "text" describing the cell location and "correct_answer"
- Always extract the correct answers
- **PARAGRAPH LABEL DETECTION**: Count how many labeled paragraphs (A, B, C...) exist in the passage and use them for MI/MH options

**ERROR HANDLING:**
If no valid content found, return:
{
    "success": false,
    "error": "No valid IELTS reading passages with questions found in the document",
    "content_type": "reading"
}

**FINAL REMINDER:** Your response must be VALID JSON only. 
- NO trailing commas before } or ]
- ALL double quotes inside strings MUST be escaped as \\"
- ALL newlines inside strings MUST be escaped as \\n
- Example: "text": "He said, \\"Hello world!\\nHow are you?\\""
- Verify JSON syntax before responding - test that it parses correctly!

Now analyze the provided PDF and extract reading passages with questions following the format above.
"""

    try:
        result = generate_ai(prompt=prompt, document=pdf_bytes, mime_type=pdf_mime_type)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"AI processing error: {str(e)}",
            "content_type": "reading",
        }


def generate_listening_parts_from_pdf(pdf_bytes, pdf_mime_type="application/pdf"):
    """
    Extract listening transcripts WITH QUESTIONS from PDF and structure them for IELTS listening test.

    Args:
        pdf_bytes: PDF file content as bytes
        pdf_mime_type: MIME type of the PDF

    Returns:
        dict: Structured listening part data with questions
    """

    prompt = """
You are an expert IELTS test content analyzer. Analyze this PDF document and extract IELTS Listening parts WITH their questions.

**CRITICAL JSON FORMATTING RULES - READ CAREFULLY:**
1. ALL newlines in text content MUST be replaced with the escape sequence \\n (not literal newlines)
2. ALL double quotes (") within strings must be escaped as \\"
3. ALL single quotes (') within strings should remain as-is (they're valid in JSON strings)
4. ALL backslashes must be escaped: \\\\
5. NO trailing commas before closing } or ]
6. All brackets and braces must be properly closed
7. Text fields (description, context, etc.) must be SINGLE LINE strings with \\n for line breaks
8. Example of correct formatting:
   "description": "First line with \\"quotes\\".\\nSecond line here."
   NOT: "description": "First line
   Second line" (this breaks JSON!)

**QUOTE ESCAPING IS CRITICAL:**
- If text contains: He said "hello"
- JSON should have: He said \\"hello\\"
- Example: "text": "She replied, \\"I don't know.\\" Then she left."

**ESSENTIAL: When extracting any text:**
- Replace ALL actual line breaks with \\n
- Escape ALL double quotes with \\"
- Keep the text as ONE continuous string
- Use \\n for line breaks, \\n\\n for paragraph breaks

**DOT-BASED INPUT DETECTION:**
- PDFs may use dotted lines (......) or underscores (______) to represent blank spaces where answers should go
- Convert these to standardized format using ONLY the <input> tag WITHOUT any question numbers
- **CRITICAL**: Do NOT include question numbers like (1), (2), (3) in the items/context - they go ONLY in the questions array
- Examples:
  * "Name: ......" → "Name: <input>" (NOT "Name: <input> (1)")
  * "Date: ______" → "Date: <input>" (NOT "Date: <input> (2)")
  * "Address: 45 ...... Street" → "Address: 45 <input> Street" (NOT "Address: 45 <input> (1) Street")
- Maintain surrounding context and punctuation
- Question numbering is handled automatically by the "order" field in the questions array

**PDF STRUCTURE HANDLING:**
- Preserve line breaks and indentation in descriptions
- Handle form-style layouts (common in Listening Part 1-2)
- Maintain question numbering even if PDF formatting is inconsistent
- Keep punctuation, spacing in questions
- Extract speaker information and context clues

**IMPORTANT INSTRUCTIONS:**
1. Identify IELTS Listening parts (Parts 1-4)
2. For every listening part, derive a clear, descriptive title that captures the scenario/speakers based solely on the listening context (do NOT leave titles generic like "Listening Part 1" unless the PDF explicitly names it that way).
3. Extract the description, context, and scenario for each part
4. Extract ALL questions associated with each part
5. Identify the question type for each question group
6. Extract answers for all questions (or mark as null if not provided)

**IELTS LISTENING QUESTION TYPES (same as Reading):**
- **MCQ**: Multiple Choice (single answer)
- **MCMA**: Multiple Choice (multiple answers)
- **SA**: Short Answer
- **SC**: Sentence Completion - INDEPENDENT sentences (each sentence is separate and standalone)
- **TFNG**: True/False/Not Given
- **YNNG**: Yes/No/Not Given
- **MF**: Matching Features
- **MI**: Matching Information
- **MH**: Matching Headings
- **SUC**: Summary Completion - CONNECTED narrative (forms a cohesive paragraph/summary with multiple blanks)
- **NC**: Note Completion
- **FC**: Form Completion
- **FCC**: Flow Chart Completion
- **TC**: Table Completion
- **DL**: Diagram Labelling
- **ML**: Map Labelling

**CRITICAL: SC vs SUC DISTINCTION - READ THIS CAREFULLY!**

⚠️ **COMMON MISTAKE**: PDFs may say "Complete the sentences" but if all sentences are about THE SAME TOPIC, it's SUC not SC!

Use **SUC (Summary Completion)** when:
- ✅ ALL sentences are about THE SAME TOPIC (e.g., all about a hotel, all about a sports center, all about a tour)
- ✅ Sentences form a CONNECTED narrative that flows together
- ✅ Removing one sentence would break the coherence of the text
- ✅ Can be read as ONE cohesive paragraph
- ✅ Describes a unified concept, process, or place
- **IMPORTANT**: Even if the PDF says "Complete the sentences", if they're all about the same topic → SUC!

**SUC Examples** (Listening):
1. Hotel description (all about hotel facilities):
   "The hotel has ___ rooms. It offers ___ and ___. Guests can enjoy ___. The restaurant serves ___."
   → All sentences about THE HOTEL = SUC ✅

2. Tour information (all about a tour):
   "The tour starts at ___. Participants will visit ___. Lunch is provided at ___. The tour ends at ___."
   → All sentences about THE TOUR = SUC ✅

Use **SC (Sentence Completion)** when:
- ❌ Each sentence is about a DIFFERENT topic
- ❌ Sentences are INDEPENDENT facts that don't relate to each other
- ❌ Can reorder sentences without losing meaning

**SC Examples** (Listening):
1. Random facts (different topics):
   "The meeting is at ___. The speaker works in ___. The cost is ___. The deadline is ___."
   → Different topics = SC ✅

**DECISION RULE**: 
🔍 Ask yourself: "Are ALL the sentences describing or explaining THE SAME thing/topic/place?"
- YES → SUC (Summary Completion) ✅
- NO → SC (Sentence Completion) ✅

**DO NOT** be misled by the PDF title! "Complete the sentences" can still be SUC if sentences are thematically connected!

**SPECIAL NOTE ON MULTIPLE CHOICE MULTIPLE ANSWERS (MCMA):**
- MCMA questions allow students to select MORE THAN ONE correct answer
- Each correct answer counts as 1 question toward the 40-question total
- Example: If a MCMA question has 3 correct answers (A, C, E), it counts as 3 questions
- The "correct_answer" field should contain ALL correct letters concatenated: "ACE" (not "A, C, E")
- Format correct_answer WITHOUT spaces or commas: "AB", "ACD", "BCE", etc.
- Use MCMA when:
  * The question explicitly asks to "Choose ALL correct answers"
  * Multiple answers are genuinely correct based on the audio
  * The instructions mention "more than one letter" or "several answers"
- MCMA questions typically have 2-5 correct answers
- Include 4-6 total choices with 2-5 being correct
- Example:
  {
    "order": 25,
    "text": "Which activities are available at the sports center?",
    "correct_answer": "BDE",
    "choices": [
      {"key": "A", "text": "Golf"},
      {"key": "B", "text": "Swimming"},
      {"key": "C", "text": "Skiing"},
      {"key": "D", "text": "Tennis"},
      {"key": "E", "text": "Yoga"}
    ]
  }

**SPECIAL NOTE ON MAP LABELLING (ML) QUESTIONS:**
- ML questions require students to label locations on a map/floor plan (very common in Listening Part 1-2)
- The map image itself is uploaded separately - the AI only extracts the structure
- **CRITICAL FORMAT** - Use this exact structure:
  "question_data": {
    "title": "Brief descriptive title of the map",
    "description": "Optional context (e.g., 'Plan of the sports center')",
    "labelCount": <number of locations to label>,
    "labels": [
      {"name": "Location name (what students see)", "correctAnswer": "Correct answer (letter/word)"},
      ...
    ],
    "note": "Image of map needs to be uploaded separately - map should have numbered locations"
  }
- **IMPORTANT**: Each label has TWO fields:
  * "name": The location/place name that students see (e.g., "Reception", "Pool", "Cafe")
  * "correctAnswer": The correct answer students must write (usually a letter like "A", "H", or a word)
- Students see: "1. Reception _________" and must write the answer (e.g., "C")
- The "questions" array mirrors the labels with "text" = label name and "correct_answer" = correct answer
- Example for Listening Part 1 (hotel floor plan):
  {
    "title": "Questions 1-5",
    "question_type": "ML",
    "description": "Label the hotel floor plan. Write the correct letter, A-H, next to questions 1-5.",
    "question_data": {
      "title": "Hotel Ground Floor Plan",
      "description": "The plan shows the layout of the ground floor",
      "labelCount": 5,
      "labels": [
        {"name": "Reception", "correctAnswer": "C"},
        {"name": "Restaurant", "correctAnswer": "F"},
        {"name": "Gym", "correctAnswer": "A"},
        {"name": "Pool", "correctAnswer": "E"},
        {"name": "Conference Room", "correctAnswer": "B"}
      ],
      "note": "Image of map needs to be uploaded separately"
    },
    "questions": [
      {"order": 1, "text": "Reception", "correct_answer": "C"},
      {"order": 2, "text": "Restaurant", "correct_answer": "F"},
      {"order": 3, "text": "Gym", "correct_answer": "A"},
      {"order": 4, "text": "Pool", "correct_answer": "E"},
      {"order": 5, "text": "Conference Room", "correct_answer": "B"}
    ]
  }
- Extract location names from the PDF (e.g., "reception", "restaurant", "parking", "garden")
- Extract correct answers if provided in an answer key (often letters A-H)
- If no answer key exists, you can infer likely answers or use placeholder letters

**LISTENING PART TYPES:**
- Part 1: Conversation in everyday context (2 speakers)
- Part 2: Monologue in everyday context
- Part 3: Conversation in educational/training context (2-4 speakers)
- Part 4: Monologue on academic subject

**OUTPUT FORMAT - Return a valid JSON object with this EXACT structure:**

**⚠️ CRITICAL RULE FOR INPUT FIELDS IN question_data.items:**
- In the "items" array, use ONLY <input> tags WITHOUT question numbers
- DO NOT add question numbers like (1), (2), (3) after <input> tags in items
- Question numbers belong ONLY in the "questions" array's "order" field
- CORRECT: "Name: <input>"
- WRONG: "Name: <input> (1)" ❌
- CORRECT: "Street Address: 45 <input> Court"
- WRONG: "Street Address: 45 <input> (1) Court" ❌

**⚠️ EXAMPLE QUESTIONS (IMPORTANT):**
- IELTS materials often include EXAMPLE questions before the actual questions
- Examples are typically marked with "Example", "e.g.", or "0" as the question number
- Examples show students how to answer the question type
- Extract examples when present and include them in the "example" field
- Example structure: {"question": "Example question text", "answer": "Example answer", "explanation": "Why this is the answer (optional)"}
- If no example is provided, set "example": null

{
    "success": true,
    "content_type": "listening",
    "parts": [
        {
            "part_number": 1,
            "title": "Booking a Hotel Room",
            "description": "A conversation between a customer and a hotel receptionist about booking a room.",
            "scenario": "Phone conversation",
            "speaker_count": 2,
            "context": "everyday",
            "question_groups": [
                {
                    "title": "Questions 1-5",
                    "question_type": "FC",
                    "description": "Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                    "example": {
                        "question": "Type of booking",
                        "answer": "single room",
                        "explanation": "The customer says they want to book a single room."
                    },
                    "question_data": {
                        "title": "Hotel Booking Form",
                        "items": [
                            {
                                "title": "Guest Information",
                                "items": [
                                    "Name: <input>",
                                    "Phone: <input>",
                                    "Check-in date: <input>"
                                ]
                            },
                            {
                                "title": "Guest Information",
                                "items": [
                                    "Name: <input>",
                                    "Phone: <input>",
                                    "Check-in date: <input>"
                                ]
                            }
                        ]
                    },
                    "questions": [
                        {
                            "order": 1,
                            "text": "Name",
                            "correct_answer": "Sarah Johnson"
                        },
                        {
                            "order": 2,
                            "text": "Phone",
                            "correct_answer": "555-1234"
                        },
                        {
                            "order": 3,
                            "text": "Preferred amenities",
                            "correct_answer": "wifi|parking|breakfast"
                        }
                    ]
                },
                {
                    "title": "Questions 6-10",
                    "question_type": "MCQ",
                    "description": "Choose the correct letter, A, B or C.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 6,
                            "text": "What type of room does the customer want?",
                            "correct_answer": "B",
                            "choices": [
                                {"key": "A", "text": "Single room"},
                                {"key": "B", "text": "Double room"},
                                {"key": "C", "text": "Suite"}
                            ]
                        }
                    ]
                },
                {
                    "title": "Questions 7-9",
                    "question_type": "MCMA",
                    "description": "Choose ALL the correct answers, A, B, C, D or E.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 7,
                            "text": "Which facilities are included in the hotel package?",
                            "correct_answer": "ABD",
                            "choices": [
                                {"key": "A", "text": "Free wifi"},
                                {"key": "B", "text": "Breakfast buffet"},
                                {"key": "C", "text": "Airport shuttle"},
                                {"key": "D", "text": "Gym access"},
                                {"key": "E", "text": "Spa treatments"}
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "part_number": 2,
            "title": "Community Center Activities",
            "description": "A talk by a community center manager about facilities and activities.",
            "scenario": "Public announcement",
            "speaker_count": 1,
            "context": "everyday",
            "question_groups": [
                {
                    "title": "Questions 11-14",
                    "question_type": "ML",
                    "description": "Label the map below. Write the correct letter, A-H, next to questions 11-14.",
                    "question_data": {
                        "title": "City Center Map",
                        "description": "The map shows various locations in the city center",
                        "labelCount": 4,
                        "labels": [
                            {"name": "Swimming Pool", "correctAnswer": "G"},
                            {"name": "Gym", "correctAnswer": "C"},
                            {"name": "Library", "correctAnswer": "A"},
                            {"name": "Cafe", "correctAnswer": "H"}
                        ],
                        "note": "Image of map needs to be uploaded separately - map should have numbered locations (11, 12, 13, 14)"
                    },
                    "questions": [
                        {
                            "order": 11,
                            "text": "Swimming Pool",
                            "correct_answer": "G"
                        },
                        {
                            "order": 12,
                            "text": "Gym",
                            "correct_answer": "C"
                        },
                        {
                            "order": 13,
                            "text": "Library",
                            "correct_answer": "A"
                        },
                        {
                            "order": 14,
                            "text": "Cafe",
                            "correct_answer": "H"
                        }
                    ]
                },
                {
                    "title": "Questions 15-18",
                    "question_type": "NC",
                    "description": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "title": "Community Center Facilities",
                        "items": [
                            {
                                "title": "Sports Area",
                                "items": [
                                    "New <input> equipment in gym",
                                    "Pool is <input> meters long",
                                    {
                                        "prefix": "Available classes:",
                                        "items": [
                                            "yoga sessions",
                                            "aerobics in the <input>"
                                        ]
                                    }
                                ]
                            },
                            {
                                "title": "Other Facilities",
                                "items": [
                                    "Library with <input> books"
                                ]
                            }
                        ]
                    },
                    "questions": [
                        {"order": 15, "text": "fitness", "correct_answer": "fitness"},
                        {"order": 16, "text": "25", "correct_answer": "25"},
                        {"order": 17, "text": "evening", "correct_answer": "evening"},
                        {"order": 18, "text": "5000", "correct_answer": "5000"}
                    ]
                }
            ]
        }
    ],
    "metadata": {
        "total_parts": 2,
        "total_questions": 18,
        "requires_audio": true,
        "note": "Audio recording needs to be uploaded separately for each part"
    }
}

**VALIDATION RULES:**
- part_number must be 1, 2, 3, or 4
- Each question MUST have order, text, and correct_answer
- **MULTIPLE CORRECT ANSWERS**: If a question has multiple correct answers, join them with pipe separator | (e.g., "answer1|answer2|answer3"). DO NOT use commas, semicolons, or other separators.
- For MCQ/MCMA: Include choices array
- For MF/MI/MH/ML: Include options in question_data
- For SUC: Include "title", "text" (with <input> for blanks), and "blankCount" in question_data. **If a word bank is provided**, include "word_list" array with {"key": "A", "text": "word"} objects. correct_answer should be the LETTER when word_list exists.
- For NC/FC: Include items structure in question_data
- For TC: Include "items" array in question_data. First row is headers, subsequent rows are data with <input> for blanks. Cells can be strings or arrays (for multi-line cells). Each question needs "text" (cell description) and "correct_answer"
- For NC: Use NESTED structure with title and items array. Items can be strings or objects with "prefix" and nested "items". Mark blanks with <input> followed by question number in parentheses.
- question_type must match one of the 16 types listed
- **CRITICAL JSON REQUIREMENTS:**
  * Return ONLY valid JSON - no trailing commas
  * Properly escape quotes and special characters in strings
  * Ensure ALL brackets and braces are properly closed
  * NO trailing commas before closing } or ]
  * Validate your JSON before responding

**QUESTION EXTRACTION TIPS:**

⚠️ **CRITICAL WARNING - MOST COMMON MISTAKE**: 
The PDF title "Complete the sentences" does NOT automatically mean SC!
**If all sentences are about THE SAME TOPIC → it's SUC, not SC!**

**REAL EXAMPLE** that is SUC (not SC):
PDF shows: "Complete the sentences below"
- "The hotel is located on ___"
- "It has ___ rooms"
- "The restaurant serves ___"
- "Guests can use the ___"

This is **SUC** because:
✅ ALL sentences about the hotel
✅ Forms connected description of one place
✅ Describes ONE unified topic (the hotel)

**Classification**: SUC with question_data containing the full connected paragraph!

---

- Questions usually appear with the listening transcript
- Look for "Questions 1-5", "Questions 6-10" patterns
- Match question numbers with the blanks or options
- For matching questions, extract both the statements and the options
- For completion questions, identify blanks marked with numbers or underscores
- **CRITICAL: Distinguishing SC vs SUC**:
  * **STEP 1**: Read all sentences and ask: "Are they all about the SAME topic?"
  * **STEP 2**: If YES → SUC. If NO → SC.
  * **STEP 3**: Ignore the PDF title - "Complete the sentences" can be SUC!
  * **Golden rule**: Same topic throughout = SUC. Different topics = SC.
- **For SUC (Summary Completion)**:
  * Extract the complete summary text with <input> tags for blanks
  * Count total blanks and set "blankCount" in question_data
  * For each question, include "question_text" with surrounding context (about 50-80 characters before and after the blank)
  * Use "correct_answer" field
- **For NC (Note Completion)**: Extract hierarchical note structure with sections, subsections, and nested bullet points. Use <input> for blanks with question numbers in parentheses. Support 2-3 levels of nesting with "title", "prefix", and "items" arrays.
- **For TC (Table Completion)**:
  * Extract table structure as 2D array in "items" field of question_data
  * First row (index 0) contains column headers: ["Header1", "Header2", "Header3", ...]
  * Subsequent rows contain data with <input> tags for blanks
  * Each cell can be:
    - String: "Simple text" or "Text with <input>"
    - Array: ["Line 1", "Line 2", "Text with <input>"] for multi-line cells
  * Example structure:
    "items": [
      ["Name", "Location", "Price"],  // Headers
      ["Restaurant A", "Main St", "<input>"],  // Row 1
      ["The <input>", "<input> Street", ["$25", "Includes <input>"]]  // Row 2 with multi-line cell
    ]
  * Each question has "text" describing the cell location and "correct_answer"
- Always extract the correct answers

**IMPORTANT NOTE:**
The actual audio files need to be uploaded separately. This extraction provides the metadata, descriptions, and questions.

**ERROR HANDLING:**
If no valid content found, return:
{
    "success": false,
    "error": "No valid IELTS listening parts with questions found in the document",
    "content_type": "listening"
}

**FINAL REMINDER:** Your response must be VALID JSON only.
- NO trailing commas before } or ]
- ALL double quotes inside strings MUST be escaped as \\"
- ALL newlines inside strings MUST be escaped as \\n
- Example: "text": "He said, \\"Hello world!\\nHow are you?\\""
- Verify JSON syntax before responding - test that it parses correctly!

Now analyze the provided PDF and extract listening parts with questions following the format above.
"""

    try:
        result = generate_ai(prompt=prompt, document=pdf_bytes, mime_type=pdf_mime_type)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"AI processing error: {str(e)}",
            "content_type": "listening",
        }


def generate_writing_tasks_from_pdf(pdf_bytes, pdf_mime_type="application/pdf"):
    """
    Extract writing tasks from PDF and structure them for IELTS writing test.

    Args:
        pdf_bytes: PDF file content as bytes
        pdf_mime_type: MIME type of the PDF

    Returns:
        dict: Structured writing task data
    """

    prompt = """
You are an expert IELTS test content analyzer. Analyze this PDF document and extract IELTS Writing tasks.

**IMPORTANT INSTRUCTIONS:**
1. Identify if this PDF contains IELTS Writing tasks (Task 1 and/or Task 2)
2. Extract the complete task prompt
3. Identify the task type:
   - Task 1: Describe visual information (graph, chart, diagram, process)
   - Task 2: Essay writing on a topic with argument/discussion
4. Extract any additional instructions or requirements
5. Identify if there's an accompanying image/diagram (for Task 1)
6. **CRITICAL**: For Task 1, identify the chart_type from these exact values:
   - "LINE_GRAPH" - Line graph showing trends over time
   - "BAR_CHART" - Bar chart comparing quantities
   - "PIE_CHART" - Pie chart showing proportions/percentages
   - "TABLE" - Table with numerical data
   - "MAP" - Map showing changes/locations
   - "PROCESS" - Process diagram showing steps/stages
   - "FLOW_CHART" - Flow chart showing sequence
   - "MIXED" - Multiple charts or mixed chart types
   - "OTHER" - Any other type not listed above

**OUTPUT FORMAT - Return a valid JSON object with this EXACT structure:**
{
    "success": true,
    "content_type": "writing",
    "tasks": [
        {
            "task_type": "TASK_1",
            "chart_type": "LINE_GRAPH",
            "prompt": "The graph below shows the consumption of three different types of fast food in the UK between 1970 and 1990. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
            "data": {
                "chart_type": "line graph",
                "time_period": "1970-1990",
                "categories": ["hamburgers", "fish and chips", "pizza"]
            },
            "min_words": 150,
            "has_visual": true,
            "visual_description": "A line graph showing consumption trends of three fast food types over 20 years"
        },
        {
            "task_type": "TASK_2",
            "chart_type": null,
            "prompt": "Some people believe that unpaid community service should be a compulsory part of high school programs. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
            "data": {
                "question_type": "opinion",
                "topic": "education and community service"
            },
            "min_words": 250,
            "has_visual": false
        }
    ],
    "metadata": {
        "total_tasks": 2,
        "test_type": "academic",
        "requires_images": true
    }
}

**CHART TYPE IDENTIFICATION RULES:**
- LINE_GRAPH: Shows trends over time with connected data points
- BAR_CHART: Uses rectangular bars to compare quantities (horizontal or vertical)
- PIE_CHART: Circular chart divided into slices showing proportions
- TABLE: Data organized in rows and columns
- MAP: Geographic representation showing locations or changes
- PROCESS: Step-by-step diagram showing how something works or is made
- FLOW_CHART: Diagram showing sequential flow of operations
- MIXED: Two or more different chart types combined
- For Task 2, chart_type should always be null

**VALIDATION RULES:**
- task_type must be "TASK_1" or "TASK_2"
- chart_type must be one of the exact values above for Task 1, or null for Task 2
- prompt must be complete and clear (minimum 20 words)
- min_words: 150 for Task 1, 250 for Task 2
- has_visual: true if diagram/graph/chart is present
- data field contains relevant metadata about the task

**TASK TYPE IDENTIFICATION:**
- Task 1: Usually starts with "The graph/chart/diagram/table shows..." or "The process illustrates..."
- Task 2: Usually starts with "Some people..." or poses a discussion/opinion question

**ERROR HANDLING:**
If the PDF does not contain IELTS writing tasks, return:
{
    "success": false,
    "error": "No valid IELTS writing tasks found in the document",
    "content_type": "unknown"
}

Now analyze the provided PDF and extract the writing tasks following the format above.
"""

    try:
        result = generate_ai(prompt=prompt, document=pdf_bytes, mime_type=pdf_mime_type)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"AI processing error: {str(e)}",
            "content_type": "writing",
        }


def generate_speaking_topics_from_pdf(pdf_bytes, pdf_mime_type="application/pdf"):
    """
    Extract speaking topics from PDF and structure them for IELTS speaking test.

    Args:
        pdf_bytes: PDF file content as bytes
        pdf_mime_type: MIME type of the PDF

    Returns:
        dict: Structured speaking topic data
    """

    prompt = """
You are an expert IELTS test content analyzer. Analyze this PDF document and extract IELTS Speaking topics and questions.

**IMPORTANT INSTRUCTIONS:**
1. Identify if this PDF contains IELTS Speaking topics (Parts 1, 2, or 3)
2. Extract questions for each part:
   - Part 1: Introduction and interview (4-5 minutes) - familiar topics
   - Part 2: Individual long turn (3-4 minutes) - speak about a specific topic
   - Part 3: Two-way discussion (4-5 minutes) - abstract discussion
3. Structure the topics and questions appropriately
4. For Part 2, extract the cue card with bullet points

**CRITICAL FOR PART 2 CUE CARDS:**
- The "main_prompt" should contain ONLY the topic sentence (e.g., "Describe a memorable journey you have taken.")
- Do NOT include "You should say:" phrase in the main_prompt or bullet_points - the UI will add this label
- The "bullet_points" should contain ONLY the points themselves, not prefixes like "You should say:"
- Each bullet point should start with lowercase and be a short phrase (e.g., "where you went", "who you were with")

**OUTPUT FORMAT - Return a valid JSON object with this EXACT structure:**
{
    "success": true,
    "content_type": "speaking",
    "topics": [
        {
            "part_number": 1,
            "topic": "Work and Studies",
            "questions": [
                "Do you work or are you a student?",
                "What do you like most about your job/studies?",
                "What are your future career plans?"
            ]
        },
        {
            "part_number": 2,
            "topic": "Describe a memorable journey",
            "cue_card": {
                "main_prompt": "Describe a memorable journey you have taken.",
                "bullet_points": [
                    "Where you went",
                    "Who you went with",
                    "What you did",
                    "And explain why this journey was memorable"
                ],
                "preparation_time": "1 minute",
                "speaking_time": "2 minutes"
            }
        },
        {
            "part_number": 3,
            "topic": "Travel and Tourism",
            "questions": [
                "How has tourism changed in your country in recent years?",
                "What are the positive and negative effects of tourism?",
                "Do you think international travel will increase in the future?"
            ]
        }
    ],
    "metadata": {
        "total_topics": 3,
        "estimated_duration": "11-14 minutes"
    }
}

**VALIDATION RULES:**
- part_number must be 1, 2, or 3
- Part 1: 3-5 questions about familiar topics
- Part 2: Must have cue card with main prompt and 3-4 bullet points
- Part 3: 4-6 questions about abstract/complex topics related to Part 2
- All questions must be complete and clear

**PART IDENTIFICATION:**
- Part 1: Simple questions about personal life, work, studies, hobbies
- Part 2: "Describe a..." with bullet points for guidance
- Part 3: More complex, analytical questions starting with "Why...", "How...", "What do you think..."

**ERROR HANDLING:**
If the PDF does not contain IELTS speaking content, return:
{
    "success": false,
    "error": "No valid IELTS speaking topics found in the document",
    "content_type": "unknown"
}

Now analyze the provided PDF and extract the speaking topics following the format above.
"""

    try:
        result = generate_ai(prompt=prompt, document=pdf_bytes, mime_type=pdf_mime_type)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"AI processing error: {str(e)}",
            "content_type": "speaking",
        }


def generate_cambridge_full_test_from_pdf(pdf_bytes, pdf_mime_type="application/pdf"):
    """
    Extract a COMPLETE Cambridge IELTS test (or similar full test book) from PDF.
    This extracts ALL sections: Listening (Parts 1-4), Reading (Passages 1-3),
    Writing (Tasks 1-2), and Speaking (Parts 1-3) in one go.

    Designed for bulk upload of Cambridge IELTS books or similar test preparation materials.

    Args:
        pdf_bytes: PDF file content as bytes
        pdf_mime_type: MIME type of the PDF

    Returns:
        dict: Complete test data with all sections
    """

    prompt = """
You are an expert IELTS test content analyzer specializing in Cambridge IELTS book extraction.
Analyze this PDF document and extract ALL IELTS test content - this could be a complete Cambridge IELTS book
or similar test preparation material containing MULTIPLE FULL TESTS.

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 1: CRITICAL JSON FORMATTING RULES
═══════════════════════════════════════════════════════════════════════════════

**MANDATORY JSON RULES - VIOLATING THESE WILL BREAK THE SYSTEM:**
1. ALL newlines in text content MUST be replaced with \\n (not literal newlines)
2. ALL double quotes (") within strings must be escaped as \\"
3. ALL single quotes (') remain as-is (valid in JSON)
4. ALL backslashes must be escaped: \\\\
5. NO trailing commas before closing } or ]
6. All brackets and braces must be properly closed
7. Text fields must be SINGLE LINE strings with \\n for line breaks

**QUOTE ESCAPING EXAMPLES:**
- Text: He said "hello" → JSON: He said \\"hello\\"
- Text: She replied, "I don't know." → JSON: She replied, \\"I don't know.\\"

**DOT-BASED INPUT DETECTION:**
- PDFs use dotted lines (......) or underscores (______) for blanks
- Convert to: <input> WITHOUT question numbers in text
- CORRECT: "Name: <input>"
- WRONG: "Name: <input> (1)" ❌
- Question numbers go ONLY in the "order" field of questions array

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 2: IELTS QUESTION TYPES (16 TYPES)
═══════════════════════════════════════════════════════════════════════════════

**READING & LISTENING QUESTION TYPES:**

1. **MCQ** - Multiple Choice (single answer)
   - 3-4 options (A, B, C, D), only ONE correct
   - correct_answer: "A" or "B" or "C" or "D"
   - Include "choices" array: [{"key": "A", "text": "Option text"}, ...]

2. **MCMA** - Multiple Choice Multiple Answers
   - 5-7 options, 2-5 correct answers
   - correct_answer: concatenated letters "ACE" or "BDF" (NO spaces/commas)
   - Each correct answer counts as 1 question toward total
   - Students receive partial credit: 2 out of 3 correct = 2 points
   - Example: "correct_answer": "ABDE" for 4 correct answers
   - Include "choices" array with all options

3. **SA** - Short Answer
   - Word limit specified (1-3 words typically)
   - correct_answer: exact answer text with alternatives separated by |

4. **SC** - Sentence Completion (INDEPENDENT sentences - DIFFERENT topics)
   ❌ Each sentence about DIFFERENT topics
   ❌ Sentences are INDEPENDENT facts that don't relate to each other
   ❌ Can reorder sentences without losing meaning
   - Example: "The capital is ___." / "The experiment lasted ___." / "Mozart was born in ___."
   - Topics: geography, science, biography = DIFFERENT = SC ✅

5. **SUC** - Summary Completion (CONNECTED narrative - SAME TOPIC)
   ⚠️ CRITICAL: Even if PDF says "Complete the sentences", if ALL about SAME TOPIC → SUC!
   ✅ ALL sentences about THE SAME TOPIC/concept/process
   ✅ Forms a coherent paragraph that flows together
   ✅ Removing one sentence would break the coherence
   ✅ Can be read as ONE cohesive paragraph
   - Example: "French TGV uses ___. Japanese trains differ because ___. The system provides ___."
   - Topic: Train technology (ALL SAME) = SUC ✅
   
   **SUC with Word List:**
   - When instructions say "using the list of words, A-G, below"
   - Include "word_list" in question_data: [{"key": "A", "text": "word1"}, ...]
   - correct_answer: the LETTER (A, B, C...) not the word
   
   **SUC without Word List:**
   - Instructions say "using words from the passage"
   - correct_answer: the actual word/phrase from passage

6. **TFNG** - True/False/Not Given (factual texts)
   - correct_answer: "TRUE" or "FALSE" or "NOT GIVEN" (exact uppercase)

7. **YNNG** - Yes/No/Not Given (opinion texts)
   - correct_answer: "YES" or "NO" or "NOT GIVEN" (exact uppercase)

8. **MF** - Matching Features
   - Match statements to names/theories/categories
   - Options: explicit list from question text
   - Include "options" in question_data: [{"value": "A", "label": "Name/Theory"}, ...]

9. **MI** - Matching Information (to paragraphs)
   - Match information to paragraph labels (A, B, C...)
   - Auto-create options from paragraph labels in passage
   - Include "options": [{"value": "A", "label": "Paragraph A"}, ...]

10. **MH** - Matching Headings
    - Match headings to paragraphs/sections
    - Options: list of headings (i, ii, iii...)
    - Include "options": [{"value": "i", "label": "Heading text"}, ...]

11. **NC** - Note Completion
    - Hierarchical structure with title, items, nested sections
    - Use <input> for blanks
    - Support 2-3 levels of nesting with "title", "prefix", and "items" arrays
    - Items can be strings or objects with nested "items"

12. **FC** - Form Completion
    - Flat or nested form-style structure
    - Use <input> for blanks
    - Common in Listening Parts 1-2

13. **TC** - Table Completion
    - 2D array: first row = headers, subsequent rows = data
    - Cells can be strings or arrays (multi-line)
    - Use <input> for blanks
    - Example: "items": [["Header1", "Header2"], ["Data", "<input>"]]

14. **FCC** - Flow Chart Completion
    - Sequential process with blanks
    - Use <input> for blanks
    - Include step-by-step flow in question_data

15. **DL** - Diagram Labelling
    - Label parts of a diagram
    - has_visual: true, visual_description required
    - Include description of diagram for context

16. **ML** - Map Labelling
    - Label locations on map/floor plan
    - question_data: {title, description, labelCount, labels: [{name, correctAnswer}], note}
    - "name": location name students see (e.g., "Swimming Pool")
    - "correctAnswer": the letter/word to write (e.g., "G")
    - Common in Listening Parts 1-2

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 2B: CRITICAL SC vs SUC DISTINCTION
═══════════════════════════════════════════════════════════════════════════════

⚠️ **MOST COMMON MISTAKE**: PDF title "Complete the sentences" does NOT automatically mean SC!

**DECISION RULE**: 
🔍 Ask: "Are ALL the sentences describing THE SAME thing/topic/concept?"
- YES → SUC (Summary Completion) ✅
- NO → SC (Sentence Completion) ✅

**SUC Examples (ALL about SAME topic):**

1. Train technology:
   "French TGV locomotives pull trains using ___. Japanese ground is unsuitable because ___. The system can act as ___. Electricity is produced by ___."
   → ALL about train systems = SUC ✅

2. Hotel description:
   "The hotel has ___ rooms. It offers ___. Guests can enjoy ___. The restaurant serves ___."
   → ALL about the hotel = SUC ✅

3. Dinosaur museum:
   "The museum closes at ___. School groups meet in ___. The tour takes ___. Students can have lunch ___."
   → ALL about the museum = SUC ✅

**SC Examples (DIFFERENT topics):**

1. Random facts:
   "The capital of France is ___. The experiment lasted ___. Mozart was born in ___."
   → Different topics (geography, science, biography) = SC ✅

2. Unrelated information:
   "The meeting is at ___. The book costs ___. The train leaves at ___."
   → Different facts = SC ✅

**DO NOT be misled by the PDF title!**

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 2C: EXAMPLE QUESTIONS HANDLING
═══════════════════════════════════════════════════════════════════════════════

- IELTS materials often include EXAMPLE questions before actual questions
- Examples are marked with "Example", "e.g.", or "0" as question number
- Extract examples when present and include in "example" field
- Structure: {"question": "Example text", "answer": "Answer", "explanation": "Optional"}
- If no example provided, set "example": null

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 2D: MAP LABELLING (ML) STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

**ML question_data structure:**
{
  "title": "Brief descriptive title of the map",
  "description": "Optional context (e.g., 'The map shows the layout of a university campus')",
  "labelCount": <number of locations to label>,
  "labels": [
    {"name": "Location name (what students see)", "correctAnswer": "Correct answer (letter/word)"},
    ...
  ],
  "note": "Image of map needs to be uploaded separately - map should have numbered locations"
}

**IMPORTANT ML Rules:**
- Each label has TWO fields:
  * "name": The location/place name that students see (e.g., "Swimming Pool", "Library")
  * "correctAnswer": The correct answer students must write (usually a letter like "A", "G")
- Students see: "11. Swimming Pool _________" and must write the answer (e.g., "G")
- The "questions" array mirrors the labels: "text" = label name, "correct_answer" = correct letter

**ML Example:**
{
  "title": "Questions 11-14",
  "question_type": "ML",
  "description": "Label the map below. Write the correct letter, A-H, next to questions 11-14.",
  "question_data": {
    "title": "University Campus Map",
    "description": "The map shows the main buildings on campus",
    "labelCount": 4,
    "labels": [
      {"name": "Library", "correctAnswer": "C"},
      {"name": "Sports Center", "correctAnswer": "F"},
      {"name": "Cafeteria", "correctAnswer": "A"},
      {"name": "Parking Lot", "correctAnswer": "E"}
    ],
    "note": "Image of map needs to be uploaded separately"
  },
  "questions": [
    {"order": 11, "text": "Library", "correct_answer": "C"},
    {"order": 12, "text": "Sports Center", "correct_answer": "F"},
    {"order": 13, "text": "Cafeteria", "correct_answer": "A"},
    {"order": 14, "text": "Parking Lot", "correct_answer": "E"}
  ]
}

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 2E: SUMMARY COMPLETION WITH WORD LIST (SUC)
═══════════════════════════════════════════════════════════════════════════════

**How to detect SUC with Word List:**
- Look for instructions like:
  * "Complete the summary using the list of words, A-G, below"
  * "Choose your answers from the box below"
  * "Select from the following options"
- There will be a summary paragraph with blanks (numbered gaps)
- A separate box/list showing word options with letters (A, B, C, D, E, F, G...)

**Structure for SUC with Word List:**
- question_type: "SUC"
- question_data MUST include "word_list" array when a word bank is present
- Each word in word_list has "key" (letter) and "text" (the word/phrase)
- The "text" field contains the summary with <input> tags for blanks
- correct_answer for each question should be the LETTER (A, B, C, etc.)

**SUC with Word List Example:**
{
  "title": "Questions 27-32",
  "question_type": "SUC",
  "description": "Complete the summary using the list of words, A-G, below.",
  "question_data": {
    "title": "The Development of Agriculture",
    "text": "Early humans began farming around <input> years ago. They first cultivated <input> crops in the Fertile Crescent. The invention of the <input> revolutionized farming practices.",
    "blankCount": 3,
    "word_list": [
      {"key": "A", "text": "10,000"},
      {"key": "B", "text": "cereal"},
      {"key": "C", "text": "plough"},
      {"key": "D", "text": "surplus food"},
      {"key": "E", "text": "irrigation"}
    ]
  },
  "questions": [
    {"order": 27, "question_text": "Early humans began farming around <input> years ago.", "correct_answer": "A"},
    {"order": 28, "question_text": "They first cultivated <input> crops", "correct_answer": "B"},
    {"order": 29, "question_text": "The invention of the <input> revolutionized", "correct_answer": "C"}
  ]
}

**CRITICAL SUC with Word List Rules:**
1. ALWAYS include "word_list" in question_data when word options are provided
2. Extract ALL words from the word bank exactly as written
3. correct_answer must be the LETTER (A, B, C...) not the word itself
4. Some words in the word_list may NOT be used (there are often extra options)
5. Preserve the exact spelling and case of words from the PDF
6. word_list letters are typically consecutive (A-G, A-H, etc.)

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 2F: INPUT FIELD RULES
═══════════════════════════════════════════════════════════════════════════════

**⚠️ CRITICAL RULE FOR INPUT FIELDS:**
- In the "items" array or similar structures, use ONLY <input> tags WITHOUT question numbers
- DO NOT add question numbers like (1), (2), (3) after <input> tags in text/items
- Question numbers belong ONLY in the "questions" array's "order" field

**CORRECT Examples:**
- "Name: <input>" ✅
- "The capital is <input>" ✅
- "He was born in <input>" ✅

**WRONG Examples:**
- "Name: <input> (1)" ❌
- "The capital is <input> (1)" ❌
- "He was born in 1. ____________" ❌

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 3: LISTENING SECTION RULES
═══════════════════════════════════════════════════════════════════════════════

**LISTENING PARTS (1-4):**
- Part 1: Conversation in everyday context (2 speakers) - Questions 1-10
- Part 2: Monologue in everyday context - Questions 11-20
- Part 3: Conversation in educational/training context (2-4 speakers) - Questions 21-30
- Part 4: Monologue on academic subject - Questions 31-40

**TITLE REQUIREMENT:** For EVERY listening part, infer a clear, descriptive title from the scenario/speakers/context (e.g., "Booking a City Tour", "Lecture on Coral Reefs"). Do NOT leave titles generic like "Listening Part 1" unless the PDF explicitly names it that way.

**DIFFICULTY ASSESSMENT (CRITICAL - Include for EVERY part/passage/task/topic):**
Analyze the content and assign a difficulty level based on these criteria:

DIFFICULTY LEVELS:
- "EASY" (Band 4-5): Simple vocabulary, straightforward questions, familiar everyday topics, short answers
  - Listening Part 1 scenarios (booking, reservations)
  - Simple reading passages about daily life
  - Task 1 with simple graphs, Task 2 on familiar topics
  - Speaking Part 1 basic questions

- "MEDIUM" (Band 5.5-6.5): Moderate vocabulary, some inferencing needed, general interest topics
  - Listening Parts 2-3, Reading Passage 1-2
  - Academic but accessible content
  - Writing tasks requiring analysis
  - Speaking with some abstract concepts

- "HARD" (Band 7-8): Advanced vocabulary, complex ideas, academic/specialized content
  - Listening Part 4, Reading Passage 3
  - Scientific, historical, or technical content
  - Writing tasks requiring nuanced arguments
  - Speaking Part 3 with abstract discussion

- "EXPERT" (Band 8.5-9): Highly academic, specialized vocabulary, subtle inferences required
  - Very complex academic texts
  - Obscure vocabulary or complex sentence structures
  - Topics requiring deep critical thinking

**LISTENING STRUCTURE:**
{
    "parts": [
        {
            "part_number": 1,
            "title": "Section 1",
            "description": "A conversation between...",
            "scenario": "Phone booking / Hotel reservation / etc.",
            "difficulty": "EASY",
            "speaker_count": 2,
            "question_groups": [
                {
                    "title": "Questions 1-3",
                    "question_type": "MI",
                    "description": "Which paragraph contains the following information?",
                    "question_data": {
                        "options": [
                            {"value": "A", "label": "Paragraph A"},
                            {"value": "B", "label": "Paragraph B"},
                            {"value": "C", "label": "Paragraph C"}
                        ]
                    },
                    "questions": [
                        {
                            "order": 1,
                            "text": "The introduction of tea to Western countries",
                            "correct_answer": "B"
                        },
                        {
                            "order": 2,
                            "text": "The historical origins of tea consumption",
                            "correct_answer": "A"
                        },
                        {
                            "order": 3,
                            "text": "Contemporary trends in tea production",
                            "correct_answer": "C"
                        }
                    ]
                },
                {
                    "title": "Questions 4-8",
                    "question_type": "MCQ",
                    "description": "Choose the correct letter, A, B, C or D.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 4,
                            "text": "What is the main topic of the passage?",
                            "correct_answer": "A",
                            "choices": [
                                {"key": "A", "text": "The history of tea"},
                                {"key": "B", "text": "Modern tea production"},
                                {"key": "C", "text": "Health benefits of tea"},
                                {"key": "D", "text": "Tea recipes"}
                            ]
                        }
                    ]
                },
                {
                    "title": "Questions 5-7",
                    "question_type": "MCMA",
                    "description": "Choose ALL the correct answers, A, B, C, D or E. (Multiple answers possible)",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 5,
                            "text": "Which of the following are mentioned as benefits of tea drinking?",
                            "correct_answer": "ACE",
                            "choices": [
                                {"key": "A", "text": "Health benefits"},
                                {"key": "B", "text": "Weight loss guarantees"},
                                {"key": "C", "text": "Cultural significance"},
                                {"key": "D", "text": "Cures all diseases"},
                                {"key": "E", "text": "Social importance"}
                            ]
                        }
                    ]
                },
                {
                    "title": "Questions 9-13",
                    "question_type": "TFNG",
                    "description": "Do the following statements agree with the information in the passage?",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 9,
                            "text": "Tea was first discovered in South America.",
                            "correct_answer": "FALSE"
                        },
                        {
                            "order": 10,
                            "text": "What are the main tea-producing countries?",
                            "correct_answer": "China|India|Sri Lanka"
                        }
                    ]
                },
                {
                    "title": "Questions 11-15",
                    "question_type": "MF",
                    "description": "Match each statement with the correct person.",
                    "question_data": {
                        "options": [
                            {"value": "A", "label": "John Smith"},
                            {"value": "B", "label": "Mary Johnson"},
                            {"value": "C", "label": "Robert Brown"}
                        ]
                    },
                    "questions": [
                        {
                            "order": 11,
                            "text": "Discovered the health benefits of chocolate",
                            "correct_answer": "A"
                        }
                    ]
                },
                {
                    "title": "Questions 16-20",
                    "question_type": "SUC",
                    "description": "Complete the summary below using words from the passage. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "title": "The Production of Chocolate",
                        "text": "Chocolate is made from cacao beans which are <input> and then <input>. The process involves several steps including <input> and <input>. Finally, the chocolate is <input> and packaged.",
                        "blankCount": 5
                    },
                    "questions": [
                        {
                            "order": 16,
                            "question_text": "Chocolate is made from cacao beans which are <input> and then",
                            "correct_answer": "harvested"
                        },
                        {
                            "order": 17,
                            "question_text": "which are harvested and then <input>. The process involves several steps",
                            "correct_answer": "roasted"
                        },
                        {
                            "order": 18,
                            "question_text": "The process involves several steps including <input> and grinding",
                            "correct_answer": "fermentation"
                        },
                        {
                            "order": 19,
                            "question_text": "several steps including fermentation and <input>. Finally, the chocolate",
                            "correct_answer": "grinding"
                        },
                        {
                            "order": 20,
                            "question_text": "and grinding. Finally, the chocolate is <input> and packaged.",
                            "correct_answer": "tempered"
                        }
                    ]
                },
                {
                    "title": "Questions 36-40",
                    "question_type": "SUC",
                    "description": "Complete the summary using the list of words, A-I, below.",
                    "question_data": {
                        "title": "High-Speed Rail Technology",
                        "text": "The French TGV system uses <input> to pull trains from both ends. In Japan, the ground is unsuitable for this approach because it contains too much <input>. The Japanese system can also act as a <input> during emergencies. Modern improvements have been made possible by advances in <input> technology. The electricity needed is primarily generated by <input>.",
                        "blankCount": 5,
                        "word_list": [
                            {"key": "A", "text": "electricity"},
                            {"key": "B", "text": "locomotives"},
                            {"key": "C", "text": "clay"},
                            {"key": "D", "text": "brake"},
                            {"key": "E", "text": "computer"},
                            {"key": "F", "text": "nuclear power"},
                            {"key": "G", "text": "suspension"},
                            {"key": "H", "text": "wheels"},
                            {"key": "I", "text": "magnetism"}
                        ]
                    },
                    "questions": [
                        {
                            "order": 36,
                            "question_text": "The French TGV system uses <input> to pull trains",
                            "correct_answer": "B"
                        },
                        {
                            "order": 37,
                            "question_text": "the ground is unsuitable because it contains too much <input>",
                            "correct_answer": "C"
                        },
                        {
                            "order": 38,
                            "question_text": "The Japanese system can also act as a <input> during emergencies",
                            "correct_answer": "D"
                        },
                        {
                            "order": 39,
                            "question_text": "improvements have been made possible by advances in <input> technology",
                            "correct_answer": "E"
                        },
                        {
                            "order": 40,
                            "question_text": "The electricity needed is primarily generated by <input>",
                            "correct_answer": "F"
                        }
                    ]
                },
                {
                    "title": "Questions 21-25",
                    "question_type": "SC",
                    "description": "Complete the sentences below using NO MORE THAN THREE WORDS from the passage.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 21,
                            "text": "The capital of France is <input>.",
                            "correct_answer": "Paris"
                        },
                        {
                            "order": 22,
                            "text": "The author was born in <input>.",
                            "correct_answer": "London"
                        },
                        {
                            "order": 23,
                            "text": "The experiment lasted for <input>.",
                            "correct_answer": "three weeks"
                        }
                    ]
                },
                {
                    "title": "Questions 21-25",
                    "question_type": "SA",
                    "description": "Answer the questions below using NO MORE THAN THREE WORDS.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 21,
                            "text": "Where did chocolate originate?",
                            "correct_answer": "Central America"
                        }
                    ]
                },
                {
                    "title": "Questions 26-29",
                    "question_type": "TC",
                    "description": "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "items": [
                            ["Name of restaurant", "Location", "Reason for recommendation", "Other comments"],
                            ["The Junction", "Greyson Street, near the station", "Good for people who are especially keen on <input>", ["Quite expensive", "The <input> is a good place for a drink"]],
                            ["Paloma", "In Bow Street next to the cinema", "<input> food, good for sharing", ["Staff are very friendly", "Need to pay £50 deposit", "A limited selection of <input> food on the menu"]],
                            ["The <input>", "At the top of a <input>", ["A famous chef", "All the <input> are very good", "Only uses <input> ingredients"], ["Set lunch costs £<input> per person", "Portions probably of <input> size"]]
                        ]
                    },
                    "questions": [
                        {"order": 26, "text": "The Junction - Reason for recommendation (food type)", "correct_answer": "seafood"},
                        {"order": 27, "text": "The Junction - Other comments (location for drinks)", "correct_answer": "garden"},
                        {"order": 28, "text": "Paloma - Reason for recommendation (type of cuisine)", "correct_answer": "Spanish"},
                        {"order": 29, "text": "Paloma - Other comments (type of food selection)", "correct_answer": "vegetarian"}
                    ]
                },
                {
                    "title": "Questions 30-35",
                    "question_type": "NC",
                    "description": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "title": "Urban River Development",
                        "items": [
                            {
                                "title": "Historical Background",
                                "items": [
                                    "Cities built on rivers for transport and trade",
                                    {
                                        "prefix": "Industrial era problems:",
                                        "items": [
                                            "increased sewage discharge",
                                            "pollution from <input>  on riverbanks"
                                        ]
                                    },
                                    "Thames declared biologically <input> in 1957"
                                ]
                            },
                            {
                                "title": "Modern Improvements",
                                "items": [
                                    "Wildlife returned including <input> species",
                                    "Old warehouses converted to <input>",
                                    "Cities create riverside <input> for recreation"
                                ]
                            }
                        ]
                    },
                    "questions": [
                        {"order": 30, "text": "factories", "correct_answer": "factories"},
                        {"order": 31, "text": "dead", "correct_answer": "dead"},
                        {"order": 32, "text": "rare", "correct_answer": "rare"},
                        {"order": 33, "text": "apartments", "correct_answer": "apartments"},
                        {"order": 34, "text": "parks", "correct_answer": "parks"}
                    ]
                },
                {
                    "title": "Questions 1-5",
                    "question_type": "FC",
                    "description": "Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                    "example": {
                        "question": "Type of booking",
                        "answer": "single room",
                        "explanation": "The customer says they want to book a single room."
                    },
                    "question_data": {
                        "title": "Hotel Booking Form",
                        "items": [
                            {
                                "title": "Guest Information",
                                "items": [
                                    "Name: <input>",
                                    "Phone: <input>",
                                    "Check-in date: <input>"
                                ]
                            },
                            {
                                "title": "Payment Information",
                                "items": [
                                    "Card number: <input>",
                                    "Expiry date: <input>",
                                    "CVV: <input>"
                                ]
                            }
                        ]
                    },
                    "questions": [
                        {
                            "order": 1,
                            "text": "Name",
                            "correct_answer": "Sarah Johnson"
                        },
                        {
                            "order": 2,
                            "text": "Phone",
                            "correct_answer": "555-1234"
                        },
                        {
                            "order": 3,
                            "text": "Preferred amenities",
                            "correct_answer": "wifi|parking|breakfast"
                        },
                        {
                            "order": 1,
                            "text": "Card number: <input>",
                            "correct_answer": "4111111111111111"
                        },
                        {
                            "order": 2,
                            "text": "Expiry date: <input>",
                            "correct_answer": "12/25|1225"
                        },
                        {
                            "order": 3,
                            "text": "CVV: <input>",
                            "correct_answer": "123"
                        },
                    ]
                }
            ]
        }
    ]
}

**NOTE:** Audio files are uploaded separately. Extract metadata, descriptions, and questions only.

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 4: READING SECTION RULES
═══════════════════════════════════════════════════════════════════════════════

**READING PASSAGES (1-3):**
- Passage 1: Questions 1-13 (easier, factual)
- Passage 2: Questions 14-26 (medium difficulty)
- Passage 3: Questions 27-40 (harder, academic)

**TITLE REQUIREMENT:** For EVERY reading passage, derive a concise, informative title directly from the passage content, even if the PDF omits one. The title should capture the main topic/storyline to help reviewers understand the passage at a glance.

**CRITICAL: PARAGRAPH LABELS**
- IELTS passages have paragraphs labeled A, B, C, D, E, F, G, H...
- PRESERVE these labels - they're needed for MI/MH questions!
- Format: "<strong>A</strong>\\nFirst paragraph text here...\\n\\n<strong>B</strong>\\nSecond paragraph..."

**READING STRUCTURE:**
{
    "passages": [
        {
            "passage_number": 1,
            "title": "A Chronicle of Timekeeping",
            "summary": "This passage explores the history of measuring time...",
            "difficulty": "EASY",
            "content": "<strong>A</strong>\\nAccording to archaeological evidence...\\n\\n<strong>B</strong>\\nBefore the invention of artificial light...",
            "question_groups": [
                {
                    "title": "Questions 1-3",
                    "question_type": "MI",
                    "description": "Which paragraph contains the following information?",
                    "question_data": {
                        "options": [
                            {"value": "A", "label": "Paragraph A"},
                            {"value": "B", "label": "Paragraph B"},
                            {"value": "C", "label": "Paragraph C"}
                        ]
                    },
                    "questions": [
                        {
                            "order": 1,
                            "text": "The introduction of tea to Western countries",
                            "correct_answer": "B"
                        },
                        {
                            "order": 2,
                            "text": "The historical origins of tea consumption",
                            "correct_answer": "A"
                        },
                        {
                            "order": 3,
                            "text": "Contemporary trends in tea production",
                            "correct_answer": "C"
                        }
                    ]
                },
                {
                    "title": "Questions 4-8",
                    "question_type": "MCQ",
                    "description": "Choose the correct letter, A, B, C or D.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 4,
                            "text": "What is the main topic of the passage?",
                            "correct_answer": "A",
                            "choices": [
                                {"key": "A", "text": "The history of tea"},
                                {"key": "B", "text": "Modern tea production"},
                                {"key": "C", "text": "Health benefits of tea"},
                                {"key": "D", "text": "Tea recipes"}
                            ]
                        }
                    ]
                },
                {
                    "title": "Questions 5-7",
                    "question_type": "MCMA",
                    "description": "Choose ALL the correct answers, A, B, C, D or E. (Multiple answers possible)",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 5,
                            "text": "Which of the following are mentioned as benefits of tea drinking?",
                            "correct_answer": "ACE",
                            "choices": [
                                {"key": "A", "text": "Health benefits"},
                                {"key": "B", "text": "Weight loss guarantees"},
                                {"key": "C", "text": "Cultural significance"},
                                {"key": "D", "text": "Cures all diseases"},
                                {"key": "E", "text": "Social importance"}
                            ]
                        }
                    ]
                },
                {
                    "title": "Questions 9-13",
                    "question_type": "TFNG",
                    "description": "Do the following statements agree with the information in the passage?",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 9,
                            "text": "Tea was first discovered in South America.",
                            "correct_answer": "FALSE"
                        },
                        {
                            "order": 10,
                            "text": "What are the main tea-producing countries?",
                            "correct_answer": "China|India|Sri Lanka"
                        }
                    ]
                },
                {
                    "title": "Questions 11-15",
                    "question_type": "MF",
                    "description": "Match each statement with the correct person.",
                    "question_data": {
                        "options": [
                            {"value": "A", "label": "John Smith"},
                            {"value": "B", "label": "Mary Johnson"},
                            {"value": "C", "label": "Robert Brown"}
                        ]
                    },
                    "questions": [
                        {
                            "order": 11,
                            "text": "Discovered the health benefits of chocolate",
                            "correct_answer": "A"
                        }
                    ]
                },
                {
                    "title": "Questions 16-20",
                    "question_type": "SUC",
                    "description": "Complete the summary below using words from the passage. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "title": "The Production of Chocolate",
                        "text": "Chocolate is made from cacao beans which are <input> and then <input>. The process involves several steps including <input> and <input>. Finally, the chocolate is <input> and packaged.",
                        "blankCount": 5
                    },
                    "questions": [
                        {
                            "order": 16,
                            "question_text": "Chocolate is made from cacao beans which are <input> and then",
                            "correct_answer": "harvested"
                        },
                        {
                            "order": 17,
                            "question_text": "which are harvested and then <input>. The process involves several steps",
                            "correct_answer": "roasted"
                        },
                        {
                            "order": 18,
                            "question_text": "The process involves several steps including <input> and grinding",
                            "correct_answer": "fermentation"
                        },
                        {
                            "order": 19,
                            "question_text": "several steps including fermentation and <input>. Finally, the chocolate",
                            "correct_answer": "grinding"
                        },
                        {
                            "order": 20,
                            "question_text": "and grinding. Finally, the chocolate is <input> and packaged.",
                            "correct_answer": "tempered"
                        }
                    ]
                },
                {
                    "title": "Questions 36-40",
                    "question_type": "SUC",
                    "description": "Complete the summary using the list of words, A-I, below.",
                    "question_data": {
                        "title": "High-Speed Rail Technology",
                        "text": "The French TGV system uses <input> to pull trains from both ends. In Japan, the ground is unsuitable for this approach because it contains too much <input>. The Japanese system can also act as a <input> during emergencies. Modern improvements have been made possible by advances in <input> technology. The electricity needed is primarily generated by <input>.",
                        "blankCount": 5,
                        "word_list": [
                            {"key": "A", "text": "electricity"},
                            {"key": "B", "text": "locomotives"},
                            {"key": "C", "text": "clay"},
                            {"key": "D", "text": "brake"},
                            {"key": "E", "text": "computer"},
                            {"key": "F", "text": "nuclear power"},
                            {"key": "G", "text": "suspension"},
                            {"key": "H", "text": "wheels"},
                            {"key": "I", "text": "magnetism"}
                        ]
                    },
                    "questions": [
                        {
                            "order": 36,
                            "question_text": "The French TGV system uses <input> to pull trains",
                            "correct_answer": "B"
                        },
                        {
                            "order": 37,
                            "question_text": "the ground is unsuitable because it contains too much <input>",
                            "correct_answer": "C"
                        },
                        {
                            "order": 38,
                            "question_text": "The Japanese system can also act as a <input> during emergencies",
                            "correct_answer": "D"
                        },
                        {
                            "order": 39,
                            "question_text": "improvements have been made possible by advances in <input> technology",
                            "correct_answer": "E"
                        },
                        {
                            "order": 40,
                            "question_text": "The electricity needed is primarily generated by <input>",
                            "correct_answer": "F"
                        }
                    ]
                },
                {
                    "title": "Questions 21-25",
                    "question_type": "SC",
                    "description": "Complete the sentences below using NO MORE THAN THREE WORDS from the passage.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 21,
                            "text": "The capital of France is <input>.",
                            "correct_answer": "Paris"
                        },
                        {
                            "order": 22,
                            "text": "The author was born in <input>.",
                            "correct_answer": "London"
                        },
                        {
                            "order": 23,
                            "text": "The experiment lasted for <input>.",
                            "correct_answer": "three weeks"
                        }
                    ]
                },
                {
                    "title": "Questions 21-25",
                    "question_type": "SA",
                    "description": "Answer the questions below using NO MORE THAN THREE WORDS.",
                    "question_data": {},
                    "questions": [
                        {
                            "order": 21,
                            "text": "Where did chocolate originate?",
                            "correct_answer": "Central America"
                        }
                    ]
                },
                {
                    "title": "Questions 26-29",
                    "question_type": "TC",
                    "description": "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "items": [
                            ["Name of restaurant", "Location", "Reason for recommendation", "Other comments"],
                            ["The Junction", "Greyson Street, near the station", "Good for people who are especially keen on <input>", ["Quite expensive", "The <input> is a good place for a drink"]],
                            ["Paloma", "In Bow Street next to the cinema", "<input> food, good for sharing", ["Staff are very friendly", "Need to pay £50 deposit", "A limited selection of <input> food on the menu"]],
                            ["The <input>", "At the top of a <input>", ["A famous chef", "All the <input> are very good", "Only uses <input> ingredients"], ["Set lunch costs £<input> per person", "Portions probably of <input> size"]]
                        ]
                    },
                    "questions": [
                        {"order": 26, "text": "The Junction - Reason for recommendation (food type)", "correct_answer": "seafood"},
                        {"order": 27, "text": "The Junction - Other comments (location for drinks)", "correct_answer": "garden"},
                        {"order": 28, "text": "Paloma - Reason for recommendation (type of cuisine)", "correct_answer": "Spanish"},
                        {"order": 29, "text": "Paloma - Other comments (type of food selection)", "correct_answer": "vegetarian"}
                    ]
                },
                {
                    "title": "Questions 30-35",
                    "question_type": "NC",
                    "description": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
                    "question_data": {
                        "title": "Urban River Development",
                        "items": [
                            {
                                "title": "Historical Background",
                                "items": [
                                    "Cities built on rivers for transport and trade",
                                    {
                                        "prefix": "Industrial era problems:",
                                        "items": [
                                            "increased sewage discharge",
                                            "pollution from <input>  on riverbanks"
                                        ]
                                    },
                                    "Thames declared biologically <input> in 1957"
                                ]
                            },
                            {
                                "title": "Modern Improvements",
                                "items": [
                                    "Wildlife returned including <input> species",
                                    "Old warehouses converted to <input>",
                                    "Cities create riverside <input> for recreation"
                                ]
                            }
                        ]
                    },
                    "questions": [
                        {"order": 30, "text": "factories", "correct_answer": "factories"},
                        {"order": 31, "text": "dead", "correct_answer": "dead"},
                        {"order": 32, "text": "rare", "correct_answer": "rare"},
                        {"order": 33, "text": "apartments", "correct_answer": "apartments"},
                        {"order": 34, "text": "parks", "correct_answer": "parks"}
                    ]
                },
                {
                    "title": "Questions 1-5",
                    "question_type": "FC",
                    "description": "Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
                    "example": {
                        "question": "Type of booking",
                        "answer": "single room",
                        "explanation": "The customer says they want to book a single room."
                    },
                    "question_data": {
                        "title": "Hotel Booking Form",
                        "items": [
                            {
                                "title": "Guest Information",
                                "items": [
                                    "Name: <input>",
                                    "Phone: <input>",
                                    "Check-in date: <input>"
                                ]
                            },
                            {
                                "title": "Payment Information",
                                "items": [
                                    "Card number: <input>",
                                    "Expiry date: <input>",
                                    "CVV: <input>"
                                ]
                            }
                        ]
                    },
                    "questions": [
                        {
                            "order": 1,
                            "text": "Name",
                            "correct_answer": "Sarah Johnson"
                        },
                        {
                            "order": 2,
                            "text": "Phone",
                            "correct_answer": "555-1234"
                        },
                        {
                            "order": 3,
                            "text": "Preferred amenities",
                            "correct_answer": "wifi|parking|breakfast"
                        },
                        {
                            "order": 1,
                            "text": "Card number: <input>",
                            "correct_answer": "4111111111111111"
                        },
                        {
                            "order": 2,
                            "text": "Expiry date: <input>",
                            "correct_answer": "12/25|1225"
                        },
                        {
                            "order": 3,
                            "text": "CVV: <input>",
                            "correct_answer": "123"
                        },
                    ]
                },
            ]
        }
    ]
}

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 5: WRITING SECTION RULES
═══════════════════════════════════════════════════════════════════════════════

**WRITING TASKS:**
- Task 1: Describe visual information (150+ words)
  - Academic: graph, chart, diagram, process, map, table
  - General Training: letter writing
- Task 2: Essay on a topic (250+ words)
  - Opinion, discussion, problem-solution, advantages-disadvantages

**CHART TYPE IDENTIFICATION FOR TASK 1:**
You MUST identify and assign one of these exact values for `chart_type` field:
- "LINE_GRAPH" - Line graph showing trends over time
- "BAR_CHART" - Bar chart comparing quantities (horizontal or vertical)
- "PIE_CHART" - Pie chart showing proportions/percentages
- "TABLE" - Table with numerical data
- "MAP" - Map showing changes/locations
- "PROCESS" - Process diagram showing steps/stages
- "FLOW_CHART" - Flow chart showing sequence
- "MIXED" - Multiple charts or mixed chart types
- "OTHER" - Any other type not listed above
- For Task 2, chart_type should be null

**WRITING STRUCTURE:**
{
    "tasks": [
        {
            "task_type": "TASK_1",
            "chart_type": "LINE_GRAPH",
            "prompt": "The graph below shows the consumption of three different types of fast food...",
            "difficulty": "MEDIUM",
            "min_words": 150,
            "has_visual": true,
            "visual_description": "A line graph showing consumption trends of hamburgers, fish and chips, and pizza from 1970-1990",
            "data": {
                "chart_type": "line graph",
                "time_period": "1970-1990",
                "categories": ["hamburgers", "fish and chips", "pizza"]
            }
        },
        {
            "task_type": "TASK_2",
            "chart_type": null,
            "prompt": "Some people believe that unpaid community service should be a compulsory part of high school programs. To what extent do you agree or disagree?",
            "difficulty": "HARD",
            "min_words": 250,
            "has_visual": false,
            "data": {
                "question_type": "opinion",
                "topic": "education and community service"
            }
        }
    ]
}

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 6: SPEAKING SECTION RULES
═══════════════════════════════════════════════════════════════════════════════

**SPEAKING PARTS:**
- Part 1: Introduction & Interview (4-5 min) - familiar topics, 4-5 questions
- Part 2: Individual Long Turn (3-4 min) - cue card with bullet points
- Part 3: Two-way Discussion (4-5 min) - abstract/analytical questions

**CRITICAL FOR PART 2 CUE CARDS:**
- The "main_prompt" should contain ONLY the topic sentence (e.g., "Describe a meeting you remember going to at work, college or school.")
- Do NOT include "You should say:" phrase in the main_prompt or bullet_points - the UI will add this label
- The "bullet_points" should contain ONLY the points themselves, starting with lowercase (e.g., "when and where the meeting was held")

**SPEAKING STRUCTURE:**
{
    "topics": [
        {
            "part_number": 1,
            "topic": "Work and Studies",
            "difficulty": "EASY",
            "questions": [
                "Do you work or are you a student?",
                "What do you like most about your job/studies?",
                "What would you like to change about it?",
                "What are your future plans?"
            ]
        },
        {
            "part_number": 2,
            "topic": "Describe a meeting you remember going to",
            "difficulty": "MEDIUM",
            "cue_card": {
                "main_prompt": "Describe a meeting you remember going to at work, college or school.",
                "bullet_points": [
                    "when and where the meeting was held",
                    "who was at the meeting",
                    "what the people at the meeting talked about",
                    "and explain why you remember going to this meeting"
                ],
                "preparation_time": "1 minute",
                "speaking_time": "2 minutes"
            }
        },
        {
            "part_number": 3,
            "topic": "Going to meetings",
            "difficulty": "HARD",
            "questions": [
                "What are the different types of meetings that people often go to?",
                "Some people say that no-one likes to go to meetings - what do you think?",
                "Why can it sometimes be important to go to meetings?"
            ]
        }
    ]
}

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 7: COMPLETE OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

{
    "success": true,
    "content_type": "full_test",
    "book_info": {
        "title": "Cambridge IELTS 10",
        "total_tests": 4,
        "extracted_tests": 4
    },
    "tests": [
        {
            "test_number": 1,
            "test_name": "Test 1",
            "listening": { ... },
            "reading": { ... },
            "writing": { ... },
            "speaking": { ... }
        }
    ],
    "metadata": {
        "total_listening_parts": 16,
        "total_reading_passages": 12,
        "total_writing_tasks": 8,
        "total_speaking_parts": 12,
        "has_answer_key": true,
        "extraction_quality": "high"
    }
}

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 8: CORRECT ANSWER EXPANSION RULES
═══════════════════════════════════════════════════════════════════════════════

**CRITICAL: Cambridge answer keys use shorthand notation. You MUST expand these into ALL valid variations!**

**PATTERN 1: Parentheses = Optional words**
- `(free) drink` means: "free drink" OR "drink"
- `(the) pianist` means: "the pianist" OR "pianist"
- `(some) tables` means: "some tables" OR "tables"

**PATTERN 2: Parentheses with (s) = Singular/Plural**
- `drink(s)` means: "drink" OR "drinks"
- `refreshment(s)` means: "refreshment" OR "refreshments"
- `impact(s)` means: "impact" OR "impacts"

**PATTERN 3: Pipe | = Alternative answers**
- `car-park|parking lot` means: "car-park" OR "parking lot"
- `25 December|Christmas Day` means: "25 December" OR "Christmas Day"

**PATTERN 4: Combined patterns - EXPAND ALL COMBINATIONS!**
When you see: `(free) drink(s)|(free) refreshment(s)`
You MUST expand to ALL valid combinations:
- "free drink|free drinks|drink|drinks|free refreshment|free refreshments|refreshment|refreshments"

**EXPANSION EXAMPLES:**

1. PDF shows: `(free) drink(s)|(free) refreshment(s)`
   correct_answer: "free drink|free drinks|drink|drinks|free refreshment|free refreshments|refreshment|refreshments"

2. PDF shows: `(the/a) pianist|piano player`
   correct_answer: "the pianist|a pianist|pianist|piano player"

3. PDF shows: `impact(s)|effect(s)`
   correct_answer: "impact|impacts|effect|effects"

4. PDF shows: `(some) tables`
   correct_answer: "some tables|tables"

5. PDF shows: `distortion(s)`
   correct_answer: "distortion|distortions"

6. PDF shows: `car-park|parking lot`
   correct_answer: "car-park|parking lot"

7. PDF shows: `12,000|12000`
   correct_answer: "12,000|12000"

8. PDF shows: `50%`
   correct_answer: "50%|50"

**ALGORITHM FOR EXPANSION:**
1. Split by `|` to get alternatives
2. For each alternative:
   a. Find all `(optional)` patterns - generate with and without
   b. Find all `word(s)` patterns - generate singular and plural
   c. Find all `(a/the)` patterns - generate all article variations plus no article
3. Combine all variations with `|` separator
4. Remove duplicates

**NEVER output raw Cambridge notation like `(free) drink(s)` - ALWAYS expand!**

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 9: CRITICAL EXTRACTION RULES
═══════════════════════════════════════════════════════════════════════════════

**EXTRACTION FUNDAMENTALS:**
1. **Extract ALL tests** - Cambridge books typically have 4 complete tests
2. **Each test has 4 sections** - Listening, Reading, Writing, Speaking
3. **40 questions per section** - Listening (40), Reading (40), total 80 per test
4. **Preserve paragraph labels** - Use <strong>A</strong>, <strong>B</strong>... for reading passages
5. **Use <input> for blanks** - WITHOUT question numbers in text
6. **Include answers from answer key** - Set correct_answer for each question
7. **EXPAND ALL ANSWER PATTERNS** - See Section 8 for mandatory expansion rules

**QUESTION TYPE RULES:**
8. **SC vs SUC distinction** - Same topic = SUC, Different topics = SC
   - PDF title "Complete the sentences" does NOT mean SC automatically!
   - Always check: Are all sentences about THE SAME thing? → SUC
9. **MCMA format** - Concatenate letters: "ACE" not "A, C, E"
   - Each letter = 1 point (partial credit)
10. **Multiple correct answers** - Use pipe separator: "answer1|answer2"
11. **TFNG/YNNG uppercase** - Always use "TRUE", "FALSE", "NOT GIVEN" or "YES", "NO", "NOT GIVEN"

**QUESTION GROUP REQUIREMENTS:**
- **MCQ/MCMA**: Include "choices" array with all options
- **MF/MI/MH**: Include "options" array in question_data
- **SUC with word bank**: Include "word_list" array, correct_answer is LETTER
- **SUC without word bank**: correct_answer is the actual word/phrase
- **ML**: Include "labels" array with {name, correctAnswer}
- **NC/FC**: Include hierarchical "items" structure
- **TC**: Include 2D "items" array (first row = headers)

**QUESTION TEXT EXTRACTION:**
- For SUC: Use "question_text" with ~50-80 chars of surrounding context
- For SC: Use "text" with the complete sentence including <input>
- For MCQ: Use "text" for the question, "choices" for options
- For TFNG/YNNG: Use "text" for the statement to evaluate

**READING PASSAGE CONTENT:**
- Preserve paragraph structure with <strong>A</strong>, <strong>B</strong>... labels
- Keep \\n\\n between paragraphs
- Escape all internal quotes as \\"
- Include full passage text in "content" field

**PARTIAL EXTRACTION (if some sections unavailable):**
{
    "success": true,
    "content_type": "full_test",
    "partial": true,
    "extracted_sections": ["reading", "writing"],
    "missing_sections": ["listening", "speaking"],
    "tests": [...]
}

**ERROR HANDLING:**
{
    "success": false,
    "error": "No valid IELTS test content found in the document",
    "content_type": "unknown"
}

═══════════════════════════════════════════════════════════════════════════════
                    SECTION 10: FINAL VALIDATION CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Before returning JSON, verify:

**JSON FORMATTING:**
☐ All double quotes in text escaped as \\"
☐ All newlines in text escaped as \\n
☐ No trailing commas before } or ]
☐ All brackets/braces properly closed

**STRUCTURE INTEGRITY:**
☐ Paragraph labels preserved in reading content (<strong>A</strong>, <strong>B</strong>...)
☐ Question numbers only in "order" field, not embedded in text
☐ All question types from the 16 valid types (MCQ, MCMA, SA, SC, SUC, TFNG, YNNG, MF, MI, MH, NC, FC, TC, FCC, DL, ML)
☐ <input> tags used WITHOUT question numbers (correct: <input>, wrong: <input> (1))

**QUESTION TYPE ACCURACY:**
☐ SC/SUC correctly distinguished:
   - Same topic throughout = SUC
   - Different topics = SC
   - Ignore PDF title "Complete the sentences" - check content!
☐ SUC with word_list: correct_answer is LETTER (A, B, C), not the word
☐ SUC without word_list: correct_answer is the actual word/phrase
☐ MCMA: correct_answer is concatenated letters "ACE" (no spaces/commas)
☐ ML: questions array mirrors labels with text = name, correct_answer = letter
☐ TFNG/YNNG: correct_answer is exact uppercase: "TRUE", "FALSE", "NOT GIVEN" / "YES", "NO", "NOT GIVEN"

**ANSWER KEY EXTRACTION:**
☐ Answers extracted from answer key if available
☐ ALL correct_answer fields have EXPANDED variations (no raw Cambridge notation!)
☐ Multiple valid answers separated by | pipe character
☐ Cambridge notation (free) drink(s) expanded to: "free drink|free drinks|drink|drinks"

**COMPLETENESS:**
☐ All tests in the PDF extracted (Cambridge books typically have 4)
☐ Each test has all available sections (Listening, Reading, Writing, Speaking)
☐ Question count per section: Listening (40), Reading (40)
☐ Example questions extracted when present
☐ Include "choices" array for MCQ/MCMA questions
☐ Include "options" array for MF/MI/MH questions
☐ Include "word_list" for SUC with word bank

**METADATA QUALITY:**
☐ metadata.extraction_quality set to "high", "medium", or "low"
☐ metadata.has_answer_key indicates if answers were found

Now analyze the PDF and extract ALL complete IELTS tests following this format.
"""

    try:
        result = generate_ai(prompt=prompt, document=pdf_bytes, mime_type=pdf_mime_type)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"AI processing error: {str(e)}",
            "content_type": "full_test",
        }


def detect_content_type_from_pdf(pdf_bytes, pdf_mime_type="application/pdf"):
    """
    Automatically detect what type of IELTS content is in the PDF.

    Args:
        pdf_bytes: PDF file content as bytes
        pdf_mime_type: MIME type of the PDF

    Returns:
        dict: Detection result with content type
    """

    prompt = """
You are an expert IELTS test content analyzer. Analyze this PDF document and identify what type of IELTS content it contains.

**YOUR TASK:**
Determine if this PDF contains:
1. Reading passages
2. Listening transcripts/descriptions
3. Writing tasks
4. Speaking topics
5. Multiple types
6. None of the above

**OUTPUT FORMAT - Return a valid JSON object with this EXACT structure:**
{
    "success": true,
    "detected_types": ["reading", "writing"],
    "primary_type": "reading",
    "confidence": "high",
    "summary": "This PDF contains 2 IELTS reading passages and 1 writing task (Task 2).",
    "recommendations": {
        "reading": "Extract 2 passages",
        "writing": "Extract 1 Task 2 essay prompt"
    }
}

**CONTENT TYPE INDICATORS:**
- **Reading**: Long passages (500+ words) with academic/general topics, often with titles
- **Listening**: Describes conversations, monologues, scenarios with speakers, mentions "Part 1-4"
- **Writing**: Contains "Task 1" or "Task 2", prompts with word count requirements (150/250 words)
- **Speaking**: Contains "Part 1", "Part 2", "Part 3", interview questions, "Describe a...", cue cards

**CONFIDENCE LEVELS:**
- "high": Clear indicators present
- "medium": Some indicators but not definitive
- "low": Uncertain, needs manual review

Now analyze the provided PDF and detect the content type following the format above.
"""

    try:
        result = generate_ai(prompt=prompt, document=pdf_bytes, mime_type=pdf_mime_type)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"AI processing error: {str(e)}",
            "detected_types": [],
            "primary_type": "unknown",
        }
