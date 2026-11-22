import { registerDecorator, ValidationOptions } from 'class-validator';
import { MONEY_SCALE } from './money';

/**
 * تحقق DTO لمبلغ مالي (ADR-023): نص عشري (مش رقم JS)، بحد أقصى 6 خانات عشرية (DEC-0112) و 14 رقم صحيح (NUMERIC(20,6)).
 * الأرقام بتتبعت نصوص في الـ API عشان مافيش float في أي نقطة. allowNegative للمرتجعات/التسويات بس.
 */
export function IsMoneyString(opts: { allowNegative?: boolean; maxScale?: number } = {}, validationOptions?: ValidationOptions) {
  const scale = opts.maxScale ?? MONEY_SCALE;
  const re = new RegExp(`^${opts.allowNegative ? '-?' : ''}\\d{1,14}(\\.\\d{1,${scale}})?$`);
  return (object: object, propertyName: string) => registerDecorator({
    name: 'isMoneyString', target: object.constructor, propertyName, options: validationOptions,
    validator: {
      validate: (v: unknown) => typeof v === 'string' && re.test(v),
      defaultMessage: () => `${propertyName} لازم يكون مبلغ نصي عشري (حتى ${scale} خانات${opts.allowNegative ? '' : '، موجب'})`,
    },
  });
}
