import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, HostListener, NgZone
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  trigger, state, style, transition, animate, query, stagger
} from '@angular/animations';
import { ThreeService } from '../../core/services/three.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: [
    // Staggered fade-in for form elements
    trigger('pageEnter', [
      transition(':enter', [
        query('.anim-item', [
          style({ opacity: 0, transform: 'translateY(24px)' }),
          stagger(90, [
            animate('480ms cubic-bezier(0.35, 0, 0.25, 1)',
              style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    // Button hover state
    trigger('btnState', [
      state('idle',    style({ transform: 'scale(1)' })),
      state('hovered', style({ transform: 'scale(1.03)' })),
      transition('idle <=> hovered', animate('150ms ease'))
    ])
  ]
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  loginError = '';
  btnState: 'idle' | 'hovered' = 'idle';

  private resizeObserver!: ResizeObserver;

  constructor(
    private fb: FormBuilder,
    private threeService: ThreeService,
    private ngZone: NgZone,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.threeService.init(canvas);

    // Observe canvas container resize
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.ngZone.runOutsideAngular(() =>
          this.threeService.onResize(width, height)
        );
      }
    });
    this.resizeObserver.observe(canvas.parentElement!);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.ngZone.runOutsideAngular(() =>
      this.threeService.onMouseMove(e.clientX, e.clientY)
    );
  }

  get email() { return this.loginForm.get('email')!; }
  get password() { return this.loginForm.get('password')!; }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.loginError = '';

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: (res) => {
        this.isLoading = false;
        const roleRoutes: Record<string, string> = {
          saas_admin:   '/saas-admin',
          clinic_admin: '/clinic-admin',
          receptionist: '/receptionist',
          doctor:       '/doctor',
          lab_manager:  '/lab',
          cashier:      '/cashier',
          pharmacist:   '/pharmacist',
          patient:      '/dashboard',
        };
        const route = roleRoutes[res.user.role] ?? '/dashboard';
        this.router.navigate([route]);
      },
      error: (err) => {
        this.isLoading = false;
        this.loginError = err?.error?.message || 'Invalid email or password';
      }
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
