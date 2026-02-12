---
layout: default
title: Home
---

Hello! I am Owen Keith, a System Administrator and Computer Science Theory Enthusiast. Welcome to my personal website where I document my projects!

<ul>
  {% assign projects = site.projects | sort: "date" | reverse %}
  {% for project in projects %}
    <li>
      <a href="{{ project.url | relative_url }}">{{ project.title }}</a>
      {% if project.date %} — {{ project.date | date: "%Y-%m-%d" }}{% endif %}
    </li>
  {% endfor %}
</ul>
