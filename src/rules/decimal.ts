/** Aritmética decimal exata sobre a representação decimal dos números de entrada.
 * Não arredonda resultados intermediários e não depende de configuração global.
 */
export class Decimal {
  private constructor(
    private readonly units: bigint,
    private readonly scale: number,
  ) {}

  static from(value: number): Decimal {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('Número inválido.');
    const [coefficient, exponent = '0'] = value.toString().split('e');
    const [whole, fraction = ''] = coefficient.split('.');
    const scale = fraction.length - Number(exponent);
    const units = BigInt(whole + fraction);
    return scale < 0 ? new Decimal(units * 10n ** BigInt(-scale), 0) : new Decimal(units, scale);
  }

  private align(other: Decimal): [bigint, bigint, number] {
    const scale = Math.max(this.scale, other.scale);
    return [
      this.units * 10n ** BigInt(scale - this.scale),
      other.units * 10n ** BigInt(scale - other.scale),
      scale,
    ];
  }

  add(other: Decimal): Decimal {
    const [a, b, scale] = this.align(other);
    return new Decimal(a + b, scale);
  }

  multiply(other: Decimal): Decimal {
    return new Decimal(this.units * other.units, this.scale + other.scale);
  }

  atLeast(other: Decimal): boolean {
    const [a, b] = this.align(other);
    return a >= b;
  }

  min(other: Decimal): Decimal {
    return this.atLeast(other) ? other : this;
  }

  roundHalfUp(places: number): Decimal {
    if (!Number.isInteger(places) || places < 0 || places > 10)
      throw new RangeError('Precisão inválida.');
    if (places >= this.scale) return this;
    const divisor = 10n ** BigInt(this.scale - places);
    const whole = this.units / divisor;
    const remainder = this.units % divisor;
    return new Decimal(whole + (remainder * 2n >= divisor ? 1n : 0n), places);
  }

  toNumber(): number {
    const result = Number(`${this.units}e-${this.scale}`);
    if (!Number.isFinite(result) || (this.units !== 0n && result === 0))
      throw new RangeError('Resultado fora do intervalo numérico suportado.');
    return result;
  }
}
