import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Input from '~/components/ui/Input.vue'

describe('Input Component', () => {
  it('renders with default props', () => {
    const wrapper = mount(Input)

    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.classes()).toContain('input')
    expect(input.classes()).toContain('input--medium')
  })

  it('renders with label', () => {
    const wrapper = mount(Input, {
      props: {
        label: 'Test Label'
      }
    })

    expect(wrapper.find('label').text()).toBe('Test Label')
  })

  it('shows required indicator', () => {
    const wrapper = mount(Input, {
      props: {
        label: 'Required Field',
        required: true
      }
    })

    expect(wrapper.find('.input-required').exists()).toBe(true)
    expect(wrapper.find('.input-required').text()).toBe('*')
  })

  it('shows error message', () => {
    const wrapper = mount(Input, {
      props: {
        error: 'This field is required'
      }
    })

    expect(wrapper.find('.input-error').text()).toBe('This field is required')
    expect(wrapper.find('input').classes()).toContain('input--error')
  })

  it('shows hint message', () => {
    const wrapper = mount(Input, {
      props: {
        hint: 'Enter your email address'
      }
    })

    expect(wrapper.find('.input-hint').text()).toBe('Enter your email address')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: ''
      }
    })

    const input = wrapper.find('input')
    await input.setValue('test value')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['test value'])
  })

  it('applies size classes correctly', () => {
    const wrapper = mount(Input, {
      props: {
        size: 'large'
      }
    })

    expect(wrapper.find('input').classes()).toContain('input--large')
  })

  it('handles disabled state', () => {
    const wrapper = mount(Input, {
      props: {
        disabled: true
      }
    })

    const input = wrapper.find('input')
    expect(input.attributes('disabled')).toBeDefined()
    expect(input.classes()).toContain('input--disabled')
  })
})