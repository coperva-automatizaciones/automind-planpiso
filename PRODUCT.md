# Product

## Register

product

## Users

Personal de agencias automotrices, en una jerarquía de tres niveles:

- **Directores** — visión global del inventario y el riesgo financiero de la agencia (o de varios workspaces, si son agency owners multi-tenant).
- **Gerentes** — supervisan a su equipo de vendedores y el estado de las unidades a su cargo.
- **Vendedores** — consultan las unidades asignadas, se auto-asignan inventario y siguen su proceso de venta.

Contexto de uso: jornada laboral en la agencia, monitoreando inventario "en piso" financiado. La pregunta central que traen a la pantalla es *"¿qué unidad está por costarme dinero —o ya me está costando intereses— y quién debe actuar?"*. Uso recurrente y operativo, no esporádico.

## Product Purpose

Automind · Plan Piso administra el inventario de vehículos financiados ("plan piso") de una agencia y, sobre cada unidad, calcula cuántos días de gracia le quedan antes de empezar a generar intereses de financiamiento. Un **semáforo** de cinco estados (saludable → rotación → comprometido → próximo a vencer → en intereses) traduce ese cálculo en una señal de acción inmediata, y cuando una unidad cambia de estado el sistema notifica por correo a vendedor, gerente y director.

El éxito se ve como: ninguna unidad genera intereses "en silencio", la cadena de mando se entera a tiempo, y cualquier persona del equipo puede entender en segundos por qué una unidad está donde está (el desglose de fórmulas hace transparente cada número).

## Brand Personality

Moderno y premium, pero serio: se trata de dinero. La interfaz debe transmitir **control y confianza** — software financiero actual de primer nivel, no una hoja de cálculo heredada ni un ERP de los 2000. Tono profesional, directo y en español. Sin florituras: el protagonismo es del dato y del estado de riesgo, no de la decoración.

## Anti-references

- **SaaS genérico "AI slop"**: nada de gradientes morados decorativos, tarjetas idénticas repetidas en grid, plantilla de "hero con número gigante", ni eyebrows en mayúsculas con tracking sobre cada sección. Si parece generado por defecto, está mal.
- Por extensión: evitar también el extremo opuesto (look de Excel/ERP legacy con tablas grises densas y bordes duros por todos lados). Densidad sí, pero ordenada.
- Nada juguetón o consumer: es una herramienta financiera para profesionales.

## Design Principles

- **El semáforo manda.** La jerarquía visual existe para servir al estado de riesgo: lo crítico (en intereses, por vencer) se ve primero y más fuerte; lo saludable se mantiene tranquilo y secundario.
- **Claridad financiera sin ruido.** Cada cifra debe ser legible y confiable a primera vista. Nada decorativo compite con los números; el color se usa para significar (semáforo), no para adornar.
- **Show, don't tell.** El desglose de fórmulas que ya existe es un activo: preservar esa transparencia: el usuario debe poder ver *por qué* un número es lo que es y confiar en él.
- **Densidad útil, no saturación.** El producto maneja muchos vehículos y muchos campos; organizarlos con ritmo y respiro (respetar el toggle de densidad cómodo/compacto) en vez de amontonarlos.
- **Premium por la ejecución, no por el efecto.** La sensación de calidad viene del detalle impecable —espaciado, tipografía, estados, microinteracciones contenidas—, no de efectos llamativos.

## Accessibility & Inclusion

No es un requisito formal en esta etapa; el foco está en la funcionalidad. Aun así, se mantiene una base sensata: contraste de texto legible (apuntar a WCAG AA en cuerpo de texto y cifras, dado que la legibilidad financiera lo exige de todos modos) y no depender únicamente del color del semáforo para comunicar estado (acompañarlo de etiqueta/ícono, como ya hace la app). Revisar formalmente más adelante si el uso lo demanda.
