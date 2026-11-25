<template>
  <button
    :disabled="$props.travado"
    @click="$emit('fechar', $event)"
  >Confirmar</button>
  <slot name="acao" v-if="$slots.acao" />
</template>
