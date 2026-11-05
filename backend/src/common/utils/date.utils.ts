import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Zona horaria oficial del proyecto FlowStep (Bolivia - UTC-4).
 * Puede sobreescribirse mediante la variable de entorno APP_TIMEZONE.
 */
export const APP_DEFAULT_TIMEZONE =
  process.env.APP_TIMEZONE || 'America/La_Paz';

/**
 * Valida si un string representa una fecha de calendario real (YYYY-MM-DD).
 * Comprueba que el formato sea estrictamente 4 dígitos de año, 2 de mes y 2 de día,
 * que el mes esté entre 1 y 12, y que el día sea válido según el mes y año (bisiestos incluidos).
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12) {
    return false;
  }
  // new Date(year, month, 0) retorna el último día del mes especificado
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}

/**
 * Retorna la fecha normalizada en formato YYYY-MM-DD según la zona horaria acordada.
 * - Si no se envía fecha, calcula la fecha actual en la zona horaria de la aplicación (por defecto America/La_Paz),
 *   evitando el adelanto de 1 día que ocurre al convertir fechas nocturnas a UTC con toISOString().
 * - Si se envía una fecha con timestamp/ISO, la convierte a la fecha local en dicha zona horaria.
 * - Si se envía un string YYYY-MM-DD, verifica que sea una fecha de calendario real.
 */
export function getAppDateString(
  inputDate?: string,
  timeZone: string = APP_DEFAULT_TIMEZONE,
): string {
  if (!inputDate) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  // Si viene en formato simple YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
    if (!isValidCalendarDate(inputDate)) {
      throw new BadRequestException(
        `La fecha '${inputDate}' no es una fecha válida de calendario`,
      );
    }
    return inputDate;
  }

  // Si viene con timestamp (ISO 8601 u offset)
  const parsed = new Date(inputDate);
  if (isNaN(parsed.getTime())) {
    throw new BadRequestException(
      `La fecha '${inputDate}' no tiene un formato válido`,
    );
  }

  const dateInTz = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);

  if (!isValidCalendarDate(dateInTz)) {
    throw new BadRequestException(
      `La fecha '${inputDate}' resulta en una fecha de calendario no válida`,
    );
  }

  return dateInTz;
}

/**
 * Decorador de class-validator para asegurar que un campo sea una fecha real de calendario
 * en formato YYYY-MM-DD o ISO 8601, rechazando fechas inexistentes como 2026-99-99 o 2026-02-30.
 */
export function IsCalendarDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCalendarDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (value === undefined || value === null || value === '') {
            return true;
          }
          if (typeof value !== 'string') {
            return false;
          }

          // Si es formato YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return isValidCalendarDate(value);
          }

          // Si es formato ISO 8601 completo
          const parsed = new Date(value);
          if (isNaN(parsed.getTime())) {
            return false;
          }

          const datePart = value.split('T')[0];
          return isValidCalendarDate(datePart);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe ser una fecha de calendario real y válida (formato YYYY-MM-DD o ISO 8601)`;
        },
      },
    });
  };
}
