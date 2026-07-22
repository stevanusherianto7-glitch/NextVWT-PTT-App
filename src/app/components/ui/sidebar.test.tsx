import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from './sidebar';

describe('ui/Sidebar', () => {
  it('renders sidebar with nested structure', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>Daftar Saluran</SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Umum</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Saluran 1</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>Pengaturan</SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText('Daftar Saluran')).toBeInTheDocument();
    expect(screen.getByText('Umum')).toBeInTheDocument();
    expect(screen.getByText('Saluran 1')).toBeInTheDocument();
    expect(screen.getByText('Pengaturan')).toBeInTheDocument();
  });
});
