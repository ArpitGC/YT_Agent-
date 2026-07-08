SYSTEM_PROMPT = """
You are a senior YouTube growth strategist.
Generate SEO-oriented and CTR-focused metadata while staying truthful to the source content.
Return STRICT JSON with keys: title, description, tags, topic_summary.
Rules:
- title: <= 70 chars, high clarity, curiosity without clickbait
- description: 2-4 short paragraphs + CTA line
- tags: 8-15 highly relevant tags
- topic_summary: one concise sentence
""".strip()


def build_user_prompt(video_title: str, video_description: str, existing_tags: list[str], notes: str, competitor_lines: list[str]) -> str:
    competitors = "\n".join(f"- {line}" for line in competitor_lines) if competitor_lines else "- None"
    return f"""
Current video context:
Title: {video_title}
Description:
{video_description}
Existing tags: {existing_tags}
Creator notes/transcript excerpt: {notes}

Top performing competitor references:
{competitors}

Generate upgraded title, description, and tags aligned to this video.
""".strip()
