import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

interface RatingCategory { id: string; label: string; icon: string; rating: number; }

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'],
  animations: [
    trigger('successAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('300ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class FeedbackComponent {
  submitted = false;
  hoveredStar: Record<string, number> = {};

  categories: RatingCategory[] = [
    { id: 'treatment', label: 'Treatment Quality',  icon: '🦷', rating: 0 },
    { id: 'doctor',    label: 'Doctor Behaviour',   icon: '👨‍⚕️', rating: 0 },
    { id: 'staff',     label: 'Staff Friendliness', icon: '😊', rating: 0 },
    { id: 'facility',  label: 'Facility Cleanliness', icon: '🏥', rating: 0 },
  ];

  feedbackForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.feedbackForm = this.fb.group({
      comment: ['', [Validators.required, Validators.minLength(10)]],
      recommend: [null, Validators.required]
    });
  }

  setRating(cat: RatingCategory, val: number): void { cat.rating = val; }

  getStars(n: number): number[] { return Array.from({ length: 5 }, (_, i) => i + 1); }

  isStarFilled(cat: RatingCategory, star: number): boolean {
    const hov = this.hoveredStar[cat.id] ?? 0;
    return star <= (hov || cat.rating);
  }

  submit(): void {
    if (this.feedbackForm.invalid || this.categories.some(c => c.rating === 0)) {
      this.feedbackForm.markAllAsTouched();
      return;
    }
    this.submitted = true;
  }
}
