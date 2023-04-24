/**

*/

import * as React from 'react'
import { FC, useEffect } from 'react'
import { AnyField, Field, Form } from '../forms'
import { Form as FinalForm } from 'react-final-form'

import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import { Button } from '../styles'
import { ModalProvider } from '../react-modals'
import { LoadingDots } from './LoadingDots'
import { FormPortalProvider } from './FormPortal'
import { FieldsBuilder } from './fields-builder'
import { ResetForm } from './ResetForm'
import { FormActionMenu } from './FormActions'
import { useCMS } from '../react-core'
import { ActiveFieldContextProvider } from '../fields/use-active-field'
import { IoMdClose } from 'react-icons/io'

export interface FormBuilderProps {
  form: Form
  hideFooter?: boolean
  label?: string
  setActiveFormId?: (id: string) => void
  onPristineChange?: (_pristine: boolean) => unknown
}

interface FormKeyBindingsProps {
  onSubmit: () => void
}

const NoFieldsPlaceholder = () => (
  <div
    className="relative flex flex-col items-center justify-center text-center p-5 pb-16 w-full h-full overflow-y-auto"
    style={{
      animationName: 'fade-in',
      animationDelay: '300ms',
      animationTimingFunction: 'ease-out',
      animationIterationCount: 1,
      animationFillMode: 'both',
      animationDuration: '150ms',
    }}
  >
    <Emoji className="block pb-5">🤔</Emoji>
    <h3 className="font-sans font-normal text-lg block pb-5">
      Hey, you don't have any fields added to this form.
    </h3>
    <p className="block pb-5">
      <a
        className="text-center rounded-3xl border border-solid border-gray-100 shadow-[0_2px_3px_rgba(0,0,0,0.12)] font-normal cursor-pointer text-[12px] transition-all duration-100 ease-out bg-white text-gray-700 py-3 pr-5 pl-14 relative no-underline inline-block hover:text-blue-500"
        href="https://tinacms.org/docs/fields"
        target="_blank"
      >
        <Emoji
          className="absolute left-5 top-1/2 origin-center -translate-y-1/2 transition-all duration-100 ease-out"
          style={{ fontSize: 24 }}
        >
          📖
        </Emoji>{' '}
        Field Setup Guide
      </a>
    </p>
  </div>
)

const FormKeyBindings: FC<FormKeyBindingsProps> = ({ onSubmit }) => {
  // Submit when cmd/ctrl + s is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSubmit])

  return null
}

export const FormBuilder: FC<FormBuilderProps> = ({
  form: tinaForm,
  onPristineChange,
  setActiveFormId,
  ...rest
}) => {
  const [activeFieldName, setActiveFieldNameInner] = React.useState<
    string | null
  >(null)
  const [animatedActiveFieldName, setAnimatedActiveFieldName] = React.useState<
    string | null
  >(null)
  const [showAnimatedFields, setShowAnimatedFields] = React.useState<boolean>()
  const [isForward, setIsForward] = React.useState<boolean>(true)

  const setActiveFieldName = React.useCallback(
    (name: string | null) => {
      const isForward = name
        ? name.split('.').length >
          (activeFieldName ? activeFieldName.split('.').length : 0)
        : false
      if (isForward) {
        setIsForward(true)
        setAnimatedActiveFieldName(name)
        setShowAnimatedFields(true)
        setTimeout(() => {
          setActiveFieldNameInner(name)
        }, 250)
        setTimeout(() => {
          setShowAnimatedFields(false)
        }, 300)
      } else {
        setIsForward(false)
        setShowAnimatedFields(true)
        setActiveFieldNameInner(name)
        setTimeout(() => {
          setShowAnimatedFields(false)
        }, 300)
      }
    },
    [activeFieldName]
  )

  const hideFooter = !!rest.hideFooter
  /**
   * > Why is a `key` being set when this isn't an array?
   *
   * `FinalForm` does not update when given a new `form` prop.
   *
   * We can force `FinalForm` to update by setting the `key` to
   * the name of the form. When the name changes React will
   * treat it as a new instance of `FinalForm`, destroying the
   * old `FinalForm` componentt and create a new one.
   *
   * See: https://github.com/final-form/react-final-form/blob/master/src/ReactFinalForm.js#L68-L72
   */
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    setI((i) => i + 1)
  }, [tinaForm])

  const cms = useCMS()

  React.useEffect(() => {
    const handleSelection = (e) => {
      if (e.value.includes('#')) {
        const [formId, fieldName] = e.value.split('#')
        if (setActiveFormId) {
          setActiveFormId(formId)
        }
        setActiveFieldName(fieldName)
      }
    }

    const unsubscribe = cms.events.subscribe('field:selected', handleSelection)
    return () => {
      unsubscribe()
    }
  }, [setActiveFormId, setActiveFieldName, cms.events])

  const finalForm = tinaForm.finalForm

  const moveArrayItem = React.useCallback(
    (result: DropResult) => {
      if (!result.destination || !finalForm) return
      const name = result.type
      finalForm.mutators.move(
        name,
        result.source.index,
        result.destination.index
      )
    },
    [finalForm]
  )

  /**
   * Prevent navigation away from the window when the form is dirty
   */
  React.useEffect(() => {
    // const onBeforeUnload = (event) => {
    //   event.preventDefault()
    //   event.returnValue = ''
    // }

    const unsubscribe = finalForm.subscribe(
      ({ pristine }) => {
        if (onPristineChange) {
          onPristineChange(pristine)
        }

        // if (!pristine) {
        //   window.addEventListener('beforeunload', onBeforeUnload)
        // } else {
        //   window.removeEventListener('beforeunload', onBeforeUnload)
        // }
      },
      { pristine: true }
    )
    return () => {
      // window.removeEventListener('beforeunload', onBeforeUnload)
      unsubscribe()
    }
  }, [finalForm])

  // TODO: memoize
  const result = getFieldGroup({
    form: tinaForm,
    fieldName: activeFieldName,
    values: tinaForm.finalForm.getState().values,
    prefix: [],
  })
  const fields = result ? result.fieldGroup : tinaForm.fields

  // TODO: memoize
  const animatedResult = getFieldGroup({
    form: tinaForm,
    fieldName: animatedActiveFieldName,
    values: tinaForm.finalForm.getState().values,
    prefix: [],
  })
  const animatedFields = animatedResult
    ? animatedResult.fieldGroup
    : tinaForm.fields

  return (
    <ActiveFieldContextProvider value={{ activeFieldName, setActiveFieldName }}>
      <FinalForm
        form={finalForm}
        key={`${i}: ${tinaForm.id}`}
        onSubmit={tinaForm.onSubmit}
      >
        {({
          handleSubmit,
          pristine,
          invalid,
          submitting,
          dirtySinceLastSubmit,
          hasValidationErrors,
        }) => {
          const canSubmit =
            !pristine &&
            !submitting &&
            !hasValidationErrors &&
            !(invalid && !dirtySinceLastSubmit)

          const safeHandleSubmit = () => {
            if (canSubmit) {
              handleSubmit()
            }
          }

          return (
            <>
              <DragDropContext onDragEnd={moveArrayItem}>
                <FormKeyBindings onSubmit={safeHandleSubmit} />
                <div className="relative flex flex-col h-full overflow-scroll">
                  <FormFields
                    path={result.path}
                    setActiveFieldName={setActiveFieldName}
                    fields={fields}
                    tinaForm={tinaForm}
                  />
                  {showAnimatedFields && isForward && (
                    <GroupPanel>
                      <FormFields
                        path={animatedResult.path}
                        setActiveFieldName={setActiveFieldName}
                        fields={animatedFields}
                        tinaForm={tinaForm}
                      />
                    </GroupPanel>
                  )}
                  {showAnimatedFields && !isForward && (
                    <GroupPanel2>
                      <FormFields
                        path={animatedResult.path}
                        setActiveFieldName={setActiveFieldName}
                        fields={animatedFields}
                        tinaForm={tinaForm}
                      />
                    </GroupPanel2>
                  )}
                </div>
                {!hideFooter && (
                  <div className="relative flex-none w-full h-16 px-6 bg-white border-t border-gray-100	flex items-center justify-center">
                    <div className="flex-1 w-full flex justify-between gap-4 items-center max-w-form">
                      {tinaForm.reset && (
                        <ResetForm
                          pristine={pristine}
                          reset={async () => {
                            finalForm.reset()
                            await tinaForm.reset!()
                          }}
                          style={{ flexGrow: 1 }}
                        >
                          {tinaForm.buttons.reset}
                        </ResetForm>
                      )}
                      <Button
                        onClick={safeHandleSubmit}
                        disabled={!canSubmit}
                        busy={submitting}
                        variant="primary"
                        style={{ flexGrow: 3 }}
                      >
                        {submitting && <LoadingDots />}
                        {!submitting && tinaForm.buttons.save}
                      </Button>
                      {tinaForm.actions.length > 0 && (
                        <FormActionMenu
                          form={tinaForm as any}
                          actions={tinaForm.actions}
                        />
                      )}
                    </div>
                  </div>
                )}
              </DragDropContext>
            </>
          )
        }}
      </FinalForm>
    </ActiveFieldContextProvider>
  )
}

export const FullscreenFormBuilder: FC<FormBuilderProps> = ({
  form: tinaForm,
  label,
}) => {
  /**
   * > Why is a `key` being set when this isn't an array?
   *
   * `FinalForm` does not update when given a new `form` prop.
   *
   * We can force `FinalForm` to update by setting the `key` to
   * the name of the form. When the name changes React will
   * treat it as a new instance of `FinalForm`, destroying the
   * old `FinalForm` componentt and create a new one.
   *
   * See: https://github.com/final-form/react-final-form/blob/master/src/ReactFinalForm.js#L68-L72
   */
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    setI((i) => i + 1)
  }, [tinaForm])

  const finalForm = tinaForm.finalForm

  const moveArrayItem = React.useCallback(
    (result: DropResult) => {
      if (!result.destination || !finalForm) return
      const name = result.type
      finalForm.mutators.move(
        name,
        result.source.index,
        result.destination.index
      )
    },
    [tinaForm]
  )

  return (
    <ModalProvider>
      <FinalForm
        form={finalForm}
        key={`${i}: ${tinaForm.id}`}
        onSubmit={tinaForm.onSubmit}
      >
        {({ handleSubmit, pristine, invalid, submitting }) => {
          const canSubmit = !pristine && !submitting && !invalid

          const safeHandleSubmit = () => {
            if (canSubmit) {
              handleSubmit()
            }
          }

          return (
            <DragDropContext onDragEnd={moveArrayItem}>
              <FormKeyBindings onSubmit={safeHandleSubmit} />

              <div className="w-full h-screen flex flex-col items-center">
                <div className="px-6 py-4 w-full bg-white border-b border-gray-150 shadow-sm sticky flex flex-wrap gap-x-6 gap-y-3 justify-between items-center">
                  {label && (
                    <h4 className="font-bold font-sans text-lg opacity-80">
                      {label}
                    </h4>
                  )}
                  <div className="flex flex-1 gap-4 items-center justify-end">
                    <FormStatus pristine={pristine} />
                    {tinaForm.reset && (
                      <ResetForm
                        pristine={pristine}
                        reset={async () => {
                          finalForm.reset()
                          await tinaForm.reset!()
                        }}
                        style={{ flexBasis: '7rem' }}
                      >
                        {tinaForm.buttons.reset}
                      </ResetForm>
                    )}
                    <Button
                      onClick={safeHandleSubmit}
                      disabled={!canSubmit}
                      busy={submitting}
                      variant="primary"
                      style={{ flexBasis: '10rem' }}
                    >
                      {submitting && <LoadingDots />}
                      {!submitting && tinaForm.buttons.save}
                    </Button>
                    {tinaForm.actions.length > 0 && (
                      <FormActionMenu
                        form={tinaForm as any}
                        actions={tinaForm.actions}
                      />
                    )}
                  </div>
                </div>
                <FormPortalProvider>
                  <FormWrapper id={tinaForm.id}>
                    {tinaForm && tinaForm.fields.length ? (
                      <FieldsBuilder form={tinaForm} fields={tinaForm.fields} />
                    ) : (
                      <NoFieldsPlaceholder />
                    )}
                  </FormWrapper>
                </FormPortalProvider>
              </div>
            </DragDropContext>
          )
        }}
      </FinalForm>
    </ModalProvider>
  )
}

const FormFields = ({
  path,
  setActiveFieldName,
  fields,
  tinaForm,
}: {
  path?: string[]
  setActiveFieldName: (fieldName: string) => void
  fields: AnyField[]
  tinaForm: Form
}) => {
  if (!fields) {
    console.log({ path, tinaForm })
    throw new Error('No fields supplied to FormFields')
  }
  return (
    <FormPortalProvider
      header={
        <PanelHeader path={path} setActiveFieldName={setActiveFieldName} />
      }
      id={tinaForm.id}
    >
      <div className="w-full flex-1 max-w-form">
        {tinaForm && fields.length ? (
          <FieldsBuilder form={tinaForm} fields={fields} />
        ) : (
          <NoFieldsPlaceholder />
        )}
      </div>
    </FormPortalProvider>
  )
}

export const FormStatus = ({ pristine }) => {
  return (
    <div className="flex flex-0 items-center">
      {!pristine && (
        <>
          <span className="w-3 h-3 flex-0 rounded-full bg-yellow-400 border border-yellow-500 mr-2"></span>{' '}
          <p className="text-gray-700 text-sm leading-tight whitespace-nowrap">
            Unsaved Changes
          </p>
        </>
      )}
      {pristine && (
        <>
          <span className="w-3 h-3 flex-0 rounded-full bg-green-300 border border-green-400 mr-2"></span>{' '}
          <p className="text-gray-500 text-sm leading-tight whitespace-nowrap">
            No Changes
          </p>
        </>
      )}
    </div>
  )
}

export const FormWrapper = ({ children, id }) => {
  return (
    <div
      data-test={`form:${id?.replace(/\\/g, '/')}`}
      className="h-full overflow-y-auto max-h-full bg-gray-50 py-5 px-6"
    >
      <div className="w-full flex justify-center">
        <div className="w-full max-w-form">{children}</div>
      </div>
    </div>
  )
}

const Emoji = ({ className = '', ...props }) => (
  <span
    className={`text-[40px] leading-none inline-block ${className}`}
    {...props}
  />
)

/**
 * Given a fieldName like blocks.0
 * This will return the array of fields at blocks.0
 * But it will also return the array of fields at blocks.0
 * if blocks.0.title is provided
 */
const getFieldGroup = ({
  form,
  fieldName,
  values,
  prefix,
}): { fieldGroup: Field[]; path: string[] } | undefined => {
  if (!fieldName) {
    return { fieldGroup: form.fields, path: prefix }
  }
  const [name, ...rest] = fieldName.split('.')
  const field = form.fields.find((field) => field.name === name)
  const value = values[name]
  // When a new form is selected, the fieldName may still
  // be from a previous render
  if (!field) {
    return { fieldGroup: form.fields, path: prefix }
  }
  if (field.type === 'rich-text') {
    // handle nested forms
    console.log('its irch-text', fieldName, field)
    return { fieldGroup: field.templates.BlockQuote, path: [...prefix, name] }
  }
  if (field.type === 'object') {
    if (field.templates) {
      if (field.list) {
        const [index, ...rest2] = rest
        if (index) {
          const value2 = value[index]
          const template = field.templates[value2._template]
          if (rest2.length) {
            const result = getFieldGroup({
              form: template,
              fieldName: rest2.join('.'),
              values: value2,
              prefix: [...prefix, name, index],
            })
            if (result) {
              return result
            }
          }
          return {
            path: [...prefix, name, index],
            fieldGroup: template.fields.map((field) => {
              return {
                ...field,
                name: `${[...prefix, name, index].join('.')}.${field.name}`,
              }
            }),
          }
        } else {
          return
        }
      } else {
      }
    }
    if (field.fields) {
      if (field.list) {
        const [index, ...rest2] = rest
        if (index) {
          const value2 = value[index]
          if (rest2.length) {
            const result = getFieldGroup({
              form: field,
              fieldName: rest2.join('.'),
              values: value2,
              prefix: [...prefix, name, index],
            })
            if (result) {
              return result
            }
          }
          return {
            path: [...prefix, name, index],
            fieldGroup: field.fields.map((field) => {
              return {
                ...field,
                name: `${[...prefix, name, index].join('.')}.${field.name}`,
              }
            }),
          }
        } else {
          return
        }
      } else {
        if (rest.length) {
          const result = getFieldGroup({
            form: field,
            fieldName: rest.join('.'),
            values: value,
            prefix: [...prefix, name],
          })
          if (result) {
            return result
          }
        }
        return {
          path: [...prefix, name],
          fieldGroup: field.fields.map((field) => {
            return {
              ...field,
              name: `${[...prefix, name].join('.')}.${field.name}`,
            }
          }),
        }
      }
    }
  }
}

const isNumber = (item: string) => {
  return !isNaN(Number(item))
}

const PanelHeader = ({
  path,
  setActiveFieldName,
}: {
  path?: string[]
  setActiveFieldName: (value: string) => void
}) => {
  if (!path || path.length === 0) {
    return null
  }
  let lastItem
  let lastItemIndex
  path.forEach((item, index) => {
    if (!isNumber(item)) {
      lastItemIndex = index
      lastItem = item
    }
  })
  const returnPath = path.slice(0, lastItemIndex)

  return (
    <button
      className={`relative z-40 group text-left w-full bg-white hover:bg-gray-50 py-2 border-t border-b shadow-sm
   border-gray-100 px-6 -mt-px`}
      onClick={() => {
        setActiveFieldName(returnPath.length > 0 ? returnPath.join('.') : null)
      }}
      tabIndex={-1}
    >
      <div className="flex items-center justify-between gap-3 text-xs tracking-wide font-medium text-gray-700 group-hover:text-blue-400 uppercase max-w-form mx-auto">
        {lastItem}
        <IoMdClose className="h-auto w-5 inline-block opacity-70 -mt-0.5 -mx-0.5" />
      </div>
    </button>
  )
}

export const GroupPanel = ({ className = '', style = {}, ...props }) => (
  <div
    className={`absolute w-full top-0 bottom-0 left-0 flex flex-col justify-between overflow-hidden ${className}`}
    style={{
      zIndex: 1000, // testing
      pointerEvents: 'none',
      animationName: 'fly-in-left',
      animationDuration: '150ms',
      animationDelay: '0',
      animationIterationCount: 1,
      animationTimingFunction: 'ease-out',
      // animationFillMode: 'backwards',
      ...style,
    }}
    {...props}
  />
)

export const GroupPanel2 = ({ className = '', style = {}, ...props }) => (
  <div
    className={`absolute w-full top-0 bottom-0 left-0 flex flex-col justify-between overflow-hidden ${className}`}
    style={{
      zIndex: 1000, // testing
      pointerEvents: 'none',
      animationName: 'fly-out-right',
      animationDuration: '300ms',
      animationDelay: '0',
      animationIterationCount: 1,
      animationTimingFunction: 'ease-out',
      // animationFillMode: 'backwards',
      ...style,
    }}
    {...props}
  />
)
