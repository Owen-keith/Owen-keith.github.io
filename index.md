---
layout: default
title: Home
---

Hello! I am Owen Keith, a System Administrator and Computer Science Theory Enthusiast. Welcome to my personal website where I document my projects!

## Projects

{% assign projects = site.projects | sort: "date" | reverse %}
{% for project in projects %}
- [{{ project.title }}]({{ project.url | relative_url }}){% if project.date %} — {{ project.date | date: "%Y-%m-%d" }}{% endif %}
{% endfor %}

{% if site.projects == empty %}
*(No projects found — see troubleshooting steps below.)*
{% endif %}
