---
layout: default
title: Home
---

Hello! I am Owen Keith, a System Administrator and Computer Science Theory Enthusiast. Welcome to my personal website where I document my projects!

## Posts

{% for post in site.posts %}
- [{{ post.title }}]({{ post.url | relative_url }}) — {{ post.date | date: "%Y-%m-%d" }}
{% endfor %}
