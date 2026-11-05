import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { Platform } from '@renderer/types/platform';

import PlatformsJSONCodec from '../codecs/PlatformsJSONCodec';

const { catalog } = vi.hoisted(() => ({ catalog: new Map<string, Platform>() }));

vi.mock('./PlatformLoader', () => ({
  getPlatform: (id: string) => catalog.get(id),
  isPlatformAvailable: (id: string) => catalog.has(id),
}));

import { importGraphml } from './GraphmlParser';
import { exportCGML } from './GraphmlBuilder';

const root = process.cwd();
const images = resolve(root, 'resources/public/img');

for (const revision of ['a1', 'a2']) {
  const id = `tjc-ms2-atm-${revision}`;
  catalog.set(
    id,
    PlatformsJSONCodec.toPlatforms(
      readFileSync(resolve(root, `resources/platform/${id}-1.0.json`), 'utf8')
    )
  );
}

function imagePaths(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, item]) => {
    if (key === 'img' || key === 'icon') return typeof item === 'string' && item ? [item] : [];
    return imagePaths(item);
  });
}

describe('MS2 atmospheric platform catalog', () => {
  it('offers five sensors on A1 and only the three fitted sensors on A2', () => {
    const a1 = catalog.get('tjc-ms2-atm-a1')!;
    const a2 = catalog.get('tjc-ms2-atm-a2')!;
    expect(Object.keys(a1.components).sort()).toEqual(
      ['SimpleBus', 'DataBus', 'RGBLed', 'HP203B', 'SCD41', 'SHT30', 'XGZP6859D'].sort()
    );
    expect(Object.keys(a2.components).sort()).toEqual(
      Object.keys(a1.components)
        .filter((name) => name !== 'XGZP6859D')
        .sort()
    );
    expect(a1.components.SHT30.constructorParameters?.position.type).toEqual(['4', '5']);
    expect(a1.components.SHT30.constructorParameters?.position.valueAlias).toEqual([
      'NSHT30-CLAR',
      'SHT30',
    ]);
    expect(a2.components.SHT30.constructorParameters?.position.type).toEqual(['5']);
  });

  it.each([...catalog.keys()])('%s exposes the agreed polling and reading interface', (id) => {
    const platform = catalog.get(id)!;
    expect(platform.compile).toBe(true);
    expect(platform.hidden).not.toBe(true);
    for (const type of ['HP203B', 'SCD41', 'SHT30', 'XGZP6859D']) {
      const sensor = platform.components[type];
      if (!sensor) continue;
      expect(sensor.initializationFunction).toBe('begin');
      expect(sensor.loopActions).toEqual(['poll']);
      expect(sensor.signals.valueReceived).toMatchObject({
        alias: 'Получено значение',
        checkMethod: 'valueReceived',
      });
      expect(sensor.signals.readingError).toMatchObject({
        alias: 'Ошибка чтения',
        checkMethod: 'readingError',
      });
      expect(sensor.variables.error.type).toBe('bool');
      expect(sensor.variables.valid).toBeUndefined();
      for (const [name, field] of Object.entries(sensor.variables)) {
        if (name !== 'error') expect(field.type).toBe('int32_t');
      }
    }
  });

  it.each([...catalog.keys()])('%s has no missing platform or component artwork', (id) => {
    for (const image of imagePaths(catalog.get(id))) {
      expect(image).not.toContain('..');
      expect(existsSync(resolve(images, image)), image).toBe(true);
    }
  });

  it('ships standalone SVGs that parse without scripts or external image dependencies', () => {
    const directory = resolve(images, 'ms2-atm');
    const filenames = readdirSync(directory).filter((name) => name.endsWith('.svg'));
    expect(filenames.length).toBeGreaterThan(0);
    for (const filename of filenames) {
      const svg = new DOMParser().parseFromString(
        readFileSync(resolve(directory, filename), 'utf8'),
        'image/svg+xml'
      );
      expect(svg.querySelector('parsererror'), filename).toBeNull();
      expect(svg.documentElement.getAttribute('viewBox')).toBe('0 0 64 64');
      expect(svg.querySelector('title')?.textContent).toBeTruthy();
      expect(svg.querySelector('script, image, foreignObject')).toBeNull();
    }
  });

  it.each(['a1', 'a2'])('imports and round-trips the %s example in visual mode', (revision) => {
    const reportError = vi.fn();
    const elements = importGraphml(
      readFileSync(resolve(root, `demos/CyberiadaSchemas/ms2-atm-${revision}.graphml`), 'utf8'),
      reportError
    );
    expect(reportError).not.toHaveBeenCalled();
    expect(elements).toBeDefined();
    const machine = elements!.stateMachines.Atmosphere;
    expect(machine.platform).toBe(`tjc-ms2-atm-${revision}`);
    expect(machine.visual).toBe(true);
    expect(machine.components.s5.parameters.position).toBe('5');
    expect(machine.components.s4?.parameters.position).toBe(revision === 'a1' ? '4' : undefined);
    const restored = importGraphml(exportCGML(elements!), reportError);
    expect(reportError).not.toHaveBeenCalled();
    expect(restored!.stateMachines.Atmosphere.components).toEqual(machine.components);
    expect(restored!.stateMachines.Atmosphere.states.monitor.events).toEqual(
      machine.states.monitor.events
    );
  });
});
