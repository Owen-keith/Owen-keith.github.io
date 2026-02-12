---
layout: post
title: "Sudoless RLBench with Hardened Enroot"
date: 2026-02-12
categories: [sysadmin, HPC, AI]
---

## RLBench Headless + Enroot on robo01 (final working setup)

This setup enables non-sudo users to run RLBench headlessly inside Enroot containers, while the host provides a persistent, GPU-accelerated X server.

## Architecture

- Host runs Xorg on display `:99` (GPU-backed, headless virtual display).
- Xorg listens on TCP port `6099` (`6000 + 99`), but iptables restricts it to loopback only.
- Host stores X cookie in `/local/rlbench-x11/Xauthority` (root-owned, group-readable).
- Users run RLBench inside Enroot and connect to X via:
  - `DISPLAY=127.0.0.1:99`
  - `~/.Xauthority` populated with the host cookie
- Users can fetch the cookie via a restricted sudo rule that allows only one root command.

---

## A) Host setup (root)

### 1) Packages

Install basic X and tools (some may already exist):

```bash
apt-get update
apt-get install -y xorg x11-xserver-utils xauth mesa-utils netcat-openbsd
