import { Component } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { FormControl, Validators } from '@angular/forms';

interface ChatMessage { role: 'user' | 'ai'; text: string; time: string; }

const AI_RESPONSES = {
  fallback: "Based on your symptoms, I recommend consulting a **General Dentist** first. Would you like me to check available slots?",
  pain:     "Tooth pain can indicate cavities, infection, or nerve issues. I suggest seeing an **Endodontist** (root canal specialist). Shall I find one near you?",
  bleed:    "Gum bleeding may indicate **Gingivitis** or **Periodontitis**. A **Periodontist** would be the right specialist. Want me to book a consultation?",
  swell:    "Swelling around the jaw or gums could be an abscess. This needs urgent attention from an **Oral Surgeon**. Should I flag this as urgent?",
  align:    "For teeth alignment concerns, an **Orthodontist** is your best bet. DentaMate has 3 orthodontists available this week.",
} as const;

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss'],
  animations: [
    trigger('chatAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.85) translateY(20px)', transformOrigin: 'bottom right' }),
        animate('280ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'scale(0.9) translateY(10px)' }))
      ])
    ]),
    trigger('msgAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('200ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AiChatComponent {
  isOpen = false;
  isTyping = false;
  messages: ChatMessage[] = [
    { role: 'ai', text: "Hi Jordan! I'm your AI dental assistant. Describe your symptoms and I'll suggest the right specialist for you. 🦷", time: 'now' }
  ];
  inputCtrl = new FormControl('', [Validators.required, Validators.minLength(3)]);

  toggle(): void { this.isOpen = !this.isOpen; }

  send(): void {
    const text = this.inputCtrl.value?.trim();
    if (!text) return;

    this.messages.push({ role: 'user', text, time: this.now() });
    this.inputCtrl.reset();
    this.isTyping = true;

    setTimeout(() => {
      this.isTyping = false;
      const lower = text.toLowerCase();
      let response: string = AI_RESPONSES.fallback;
      if (lower.includes('pain') || lower.includes('ache') || lower.includes('hurt')) response = AI_RESPONSES.pain;
      else if (lower.includes('bleed') || lower.includes('gum'))                      response = AI_RESPONSES.bleed;
      else if (lower.includes('swell') || lower.includes('abscess'))                  response = AI_RESPONSES.swell;
      else if (lower.includes('align') || lower.includes('brace') || lower.includes('crooked')) response = AI_RESPONSES.align;
      this.messages.push({ role: 'ai', text: response, time: this.now() });
    }, 1200);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  private now(): string {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
