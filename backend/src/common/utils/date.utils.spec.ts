import { BadRequestException } from '@nestjs/common';
import {
  isValidCalendarDate,
  getAppDateString,
  APP_DEFAULT_TIMEZONE,
} from './date.utils';

describe('DateUtils', () => {
  describe('isValidCalendarDate', () => {
    it('debe rechazar fechas con formato o números imposibles (ej. 2026-99-99)', () => {
      expect(isValidCalendarDate('2026-99-99')).toBe(false);
      expect(isValidCalendarDate('2026-00-10')).toBe(false);
      expect(isValidCalendarDate('2026-13-01')).toBe(false);
      expect(isValidCalendarDate('texto-invalido')).toBe(false);
      expect(isValidCalendarDate('2026-1-1')).toBe(false);
    });

    it('debe rechazar días imposibles según el mes (ej. 30 de febrero, 31 de abril)', () => {
      expect(isValidCalendarDate('2026-02-30')).toBe(false);
      expect(isValidCalendarDate('2026-02-29')).toBe(false); // 2026 no es bisiesto
      expect(isValidCalendarDate('2026-04-31')).toBe(false);
      expect(isValidCalendarDate('2026-06-31')).toBe(false);
    });

    it('debe aceptar días válidos incluyendo 29 de febrero en año bisiesto', () => {
      expect(isValidCalendarDate('2024-02-29')).toBe(true); // 2024 fue bisiesto
      expect(isValidCalendarDate('2026-02-28')).toBe(true);
      expect(isValidCalendarDate('2026-11-05')).toBe(true);
      expect(isValidCalendarDate('2026-12-31')).toBe(true);
    });
  });

  describe('getAppDateString (Zona Horaria America/La_Paz)', () => {
    it('debe mantener la fecha local de Bolivia y NO adelantarla a UTC cuando son las 21:00 (01:00 UTC del día siguiente)', () => {
      // 5 de noviembre a las 21:00 Bolivia (UTC-4) corresponde a 6 de noviembre a la 01:00 UTC
      const lateNightUtcString = '2026-11-06T01:00:00.000Z';
      const result = getAppDateString(lateNightUtcString, 'America/La_Paz');
      expect(result).toBe('2026-11-05');
    });

    it('debe retornar la fecha actual en America/La_Paz si no se proporciona input', () => {
      const result = getAppDateString(undefined, 'America/La_Paz');
      expect(isValidCalendarDate(result)).toBe(true);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('debe validar y preservar fechas simples válidas (YYYY-MM-DD)', () => {
      expect(getAppDateString('2026-11-05')).toBe('2026-11-05');
    });

    it('debe lanzar BadRequestException si la fecha simple es imposible (ej. 2026-99-99)', () => {
      expect(() => getAppDateString('2026-99-99')).toThrow(BadRequestException);
      expect(() => getAppDateString('2026-02-30')).toThrow(BadRequestException);
    });
  });
});
