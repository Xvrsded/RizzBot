import type { ButtonHandler, ModalHandler, SelectMenuHandler } from "./types";

class InteractionRegistry {
  private readonly buttonHandlers = new Map<string, ButtonHandler>();
  private readonly selectMenuHandlers = new Map<string, SelectMenuHandler>();
  private readonly modalHandlers = new Map<string, ModalHandler>();

  registerButton(domain: string, handler: ButtonHandler): void {
    if (this.buttonHandlers.has(domain)) {
      throw new Error(`Button handler for domain "${domain}" is already registered`);
    }

    this.buttonHandlers.set(domain, handler);
  }

  registerSelectMenu(domain: string, handler: SelectMenuHandler): void {
    if (this.selectMenuHandlers.has(domain)) {
      throw new Error(`Select menu handler for domain "${domain}" is already registered`);
    }

    this.selectMenuHandlers.set(domain, handler);
  }

  registerModal(domain: string, handler: ModalHandler): void {
    if (this.modalHandlers.has(domain)) {
      throw new Error(`Modal handler for domain "${domain}" is already registered`);
    }

    this.modalHandlers.set(domain, handler);
  }

  getButtonHandler(domain: string): ButtonHandler | undefined {
    return this.buttonHandlers.get(domain);
  }

  getSelectMenuHandler(domain: string): SelectMenuHandler | undefined {
    return this.selectMenuHandlers.get(domain);
  }

  getModalHandler(domain: string): ModalHandler | undefined {
    return this.modalHandlers.get(domain);
  }

  getRegisteredDomains(): {
    buttons: string[];
    selectMenus: string[];
    modals: string[];
  } {
    return {
      buttons: [...this.buttonHandlers.keys()],
      selectMenus: [...this.selectMenuHandlers.keys()],
      modals: [...this.modalHandlers.keys()],
    };
  }
}

export const interactionRegistry = new InteractionRegistry();

export function registerButtonHandler(domain: string, handler: ButtonHandler): void {
  interactionRegistry.registerButton(domain, handler);
}

export function registerSelectMenuHandler(domain: string, handler: SelectMenuHandler): void {
  interactionRegistry.registerSelectMenu(domain, handler);
}

export function registerModalHandler(domain: string, handler: ModalHandler): void {
  interactionRegistry.registerModal(domain, handler);
}
