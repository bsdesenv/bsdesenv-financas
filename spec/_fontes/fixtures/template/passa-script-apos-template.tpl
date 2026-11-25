<template>
  <q-dialog v-model="aberto">
    <template v-slot:default>
      <q-btn @click="$emit('fechar')" />
    </template>
  </q-dialog>
</template>
<script setup>
aberto.value = $inicial
</script>
