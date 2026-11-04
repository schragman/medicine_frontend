import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import {
  BODY_FORMS,
  BODY_FORM_LABELS,
  BodyForm,
  DEFAULT_BODY_FORM,
  Profile,
} from '../../core/model/profile';
import { ProfileStore } from '../../core/profile.store';

const EARLIEST_BIRTH_YEAR = 1900;

/** Dialog for creating a profile (US-01). */
@Component({
  selector: 'med-profile-form-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-form-dialog.html',
  styleUrl: './profile-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormDialog {
  private readonly store = inject(ProfileStore);
  private readonly formBuilder = inject(FormBuilder);

  /** Opens the dialog when it turns true, closes it when it turns false. */
  readonly open = input(false);

  readonly created = output<Profile>();
  readonly cancelled = output<void>();

  protected readonly bodyForms = BODY_FORMS;
  protected readonly bodyFormLabels = BODY_FORM_LABELS;
  protected readonly earliestBirthYear = EARLIEST_BIRTH_YEAR;
  protected readonly latestBirthYear = new Date().getFullYear();

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [requiredName, uniqueName(this.store)]],
    birthYear: [
      null as number | null,
      [
        wholeNumber,
        Validators.min(EARLIEST_BIRTH_YEAR),
        Validators.max(this.latestBirthYear),
      ],
    ],
    bodyForm: [DEFAULT_BODY_FORM as BodyForm, Validators.required],
  });

  private readonly dialogRef =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Error text for the name field, or null while the field is valid or untouched. */
  protected readonly nameError = computed(() => {
    void this.formEvent();
    const control = this.form.controls.name;
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Bitte geben Sie einen Namen ein.';
    }
    if (control.hasError('duplicateName')) {
      return 'Es gibt bereits eine Silhouette mit diesem Namen.';
    }
    return null;
  });

  protected readonly birthYearError = computed(() => {
    void this.formEvent();
    const control = this.form.controls.birthYear;
    if (!control.touched || control.valid) {
      return null;
    }
    return `Bitte geben Sie ein Jahr zwischen ${EARLIEST_BIRTH_YEAR} und ${this.latestBirthYear} ein.`;
  });

  /** Latest form event — read by the error messages so that they recompute. */
  private readonly formEvent = toSignal(this.form.events);

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      if (this.open()) {
        if (!dialog.open) {
          this.reset();
          dialog.showModal();
        }
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  protected async submit(): Promise<void> {
    this.form.controls.name.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    try {
      const { name, birthYear, bodyForm } = this.form.getRawValue();
      const profile = await this.store.create({
        name,
        birthYear: birthYear === null || Number.isNaN(birthYear) ? null : birthYear,
        bodyForm,
      });
      this.created.emit(profile);
    } catch (error) {
      this.submitError.set(
        error instanceof Error
          ? error.message
          : 'Die Silhouette konnte nicht angelegt werden.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  /** Discards the input without asking (AC6). */
  protected cancel(): void {
    this.dialogRef().nativeElement.close();
  }

  /**
   * Runs on every native close — "Abbrechen", Esc, or a close the browser does without a
   * cancel event. Reports a cancel unless the parent has closed the dialog itself.
   */
  protected onClose(): void {
    if (this.open()) {
      this.cancelled.emit();
    }
  }

  private reset(): void {
    this.form.reset({ name: '', birthYear: null, bodyForm: DEFAULT_BODY_FORM });
    this.submitError.set(null);
    this.submitting.set(false);
  }

  /**
   * Moves the focus to the first field that blocks submission. Derived from the form
   * state rather than from rendered attributes, which are not updated yet at this point.
   */
  private focusFirstInvalidField(): void {
    const fields: ReadonlyArray<readonly [string, AbstractControl]> = [
      ['#profile-name', this.form.controls.name],
      ['#profile-birth-year', this.form.controls.birthYear],
    ];
    const firstInvalid = fields.find(([, control]) => control.invalid);
    if (firstInvalid) {
      this.dialogRef().nativeElement.querySelector<HTMLElement>(firstInvalid[0])?.focus();
    }
  }
}

/** Like Validators.required, but a name of whitespace only counts as missing too. */
function requiredName(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim() !== '' ? null : { required: true };
}

/** Rejects fractional numbers; an empty field is left to the other validators. */
function wholeNumber(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return value === null || value === '' || Number.isInteger(value) ? null : { wholeNumber: true };
}

/** Rejects names that are already in use (AC4). */
function uniqueName(store: ProfileStore): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    return store.isNameTaken(value) ? { duplicateName: true } : null;
  };
}
